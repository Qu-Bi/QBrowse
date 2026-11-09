const { ipcRenderer, contextBridge, webFrame } = require('electron');
 
// Safely wrap sendToHost so preload functions gracefully whether running inside a <webview> or a popup BrowserWindow
const origSendToHost = typeof ipcRenderer.sendToHost === 'function' ? ipcRenderer.sendToHost.bind(ipcRenderer) : null;
ipcRenderer.sendToHost = function(channel, ...args) {
    try {
        if (origSendToHost) origSendToHost(channel, ...args);
    } catch (_) {}
};

function detectIsOAuthPopup() {
    try {
        if (Array.isArray(process.argv) && process.argv.includes('--is-oauth-popup')) return true;
        if (typeof window !== 'undefined' && Boolean(window.opener)) return true;
        if (typeof window !== 'undefined' && window.location && isGoogleAuthTarget(window.location.href)) {
            if (typeof ipcRenderer.sendToHost !== 'function' || !origSendToHost) return true;
        }
    } catch (_) {}
    return false;
}
let isOAuthPopup = detectIsOAuthPopup();

function isGoogleAuthTarget(urlOrHost) {
    if (!urlOrHost) return false;
    try {
        const str = String(urlOrHost).toLowerCase();
        let hostname = str;
        if (str.includes('://')) {
            hostname = new URL(str).hostname.toLowerCase();
        }
        return hostname === 'mail.google.com' ||
               hostname === 'gmail.com' ||
               hostname.endsWith('.google.com') ||
               hostname === 'google.com' ||
               hostname.endsWith('.googleusercontent.com') ||
               hostname === 'googleusercontent.com' ||
               hostname.endsWith('.gstatic.com') ||
               hostname === 'gstatic.com' ||
               hostname.endsWith('.googleapis.com') ||
               hostname.startsWith('accounts.google.') ||
               hostname === 'oauth2.googleapis.com' ||
               hostname.startsWith('accounts.youtube.') ||
               hostname === 'myaccount.google.com' ||
               hostname.startsWith('smartlock.google.') ||
               hostname.startsWith('consent.google.') ||
               hostname.startsWith('consent.youtube.') ||
               (hostname.includes('google.') && (str.includes('/signin') || str.includes('/servicelogin') || str.includes('/gsi'))) ||
               (hostname === 'apis.google.com' && (str.includes('/auth') || str.includes('/oauth') || str.includes('/gsi')));
    } catch (_) {
        const s = String(urlOrHost).toLowerCase();
        return s.includes('mail.google.com') || s.includes('gmail.') || s.includes('googleusercontent.') || s.includes('accounts.google.') || s.includes('oauth2.googleapis.com') || s.includes('consent.google.') || s.includes('smartlock.google.');
    }
}

const currentHostname = typeof window !== 'undefined' && window.location ? (window.location.hostname || '') : '';
const currentHref = typeof window !== 'undefined' && window.location ? (window.location.href || '') : '';
const isGoogleAuth = isGoogleAuthTarget(currentHostname) || isGoogleAuthTarget(currentHref);

// Authentic Google Chrome desktop stealth hardening: remove Electron tokens, mock standard Chrome runtime APIs
try {
    const chromeFull = (process && process.versions && process.versions.chrome) || '150.0.7871.114';
    const chromeMajor = chromeFull.split('.')[0] || '150';
    const stealthChromeScript = `
        (function() {
            'use strict';
            try {
                // 1. Sanitize navigator.userAgentData to pure Google Chrome desktop on prototype
                const proto = (window.navigator && Object.getPrototypeOf(window.navigator)) || (window.navigator || {});
                if (window.navigator && window.navigator.userAgentData) {
                    const cleanBrands = [
                        { brand: 'Google Chrome', version: '${chromeMajor}' },
                        { brand: 'Chromium', version: '${chromeMajor}' },
                        { brand: 'Not_A Brand', version: '24' }
                    ];

                    const fakeUaData = {
                        brands: cleanBrands,
                        mobile: false,
                        platform: 'Windows',
                        getHighEntropyValues: async (hints = []) => {
                            const res = {
                                brands: cleanBrands,
                                mobile: false,
                                platform: 'Windows'
                            };
                            if (hints.includes('platformVersion')) res.platformVersion = '15.0.0';
                            if (hints.includes('architecture')) res.architecture = 'x86';
                            if (hints.includes('bitness')) res.bitness = '64';
                            if (hints.includes('model')) res.model = '';
                            if (hints.includes('uaFullVersion')) res.uaFullVersion = '${chromeFull}';
                            if (hints.includes('fullVersionList')) {
                                res.fullVersionList = [
                                    { brand: 'Google Chrome', version: '${chromeFull}' },
                                    { brand: 'Chromium', version: '${chromeFull}' },
                                    { brand: 'Not_A Brand', version: '24.0.0.0' }
                                ];
                            }
                            return res;
                        },
                        toJSON: () => ({
                            brands: cleanBrands,
                            mobile: false,
                            platform: 'Windows'
                        })
                    };

                    try {
                        Object.defineProperty(proto, 'userAgentData', {
                            get: () => fakeUaData,
                            configurable: true,
                            enumerable: true
                        });
                    } catch (_) {}
                }

                // 2. Inject authentic window.chrome runtime properties (csi, loadTimes, app, runtime)
                if (!window.chrome) window.chrome = {};

                if (typeof window.chrome.csi !== 'function') {
                    window.chrome.csi = function csi() {
                        const navStart = (window.performance && window.performance.timing) ? window.performance.timing.navigationStart : Date.now();
                        return {
                            startE: navStart,
                            onloadT: navStart + 120,
                            pageT: (window.performance && window.performance.now) ? window.performance.now() : 150,
                            tran: 15
                        };
                    };
                }

                if (typeof window.chrome.loadTimes !== 'function') {
                    window.chrome.loadTimes = function loadTimes() {
                        const navStart = (window.performance && window.performance.timing) ? window.performance.timing.navigationStart : Date.now();
                        const nowSec = navStart / 1000;
                        return {
                            requestTime: nowSec,
                            startLoadTime: nowSec,
                            commitLoadTime: nowSec + 0.05,
                            finishDocumentLoadTime: nowSec + 0.12,
                            finishLoadTime: nowSec + 0.15,
                            firstPaintTime: nowSec + 0.08,
                            firstPaintAfterLoadTime: 0,
                            navigationType: 'Other',
                            wasFetchedViaSpdy: true,
                            wasNpnNegotiated: true,
                            npnNegotiatedProtocol: 'h2',
                            wasAlternateProtocolAvailable: false,
                            connectionInfo: 'h2'
                        };
                    };
                }

                if (!window.chrome.app) {
                    window.chrome.app = {
                        isInstalled: false,
                        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
                        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
                        getIsInstalled: () => false,
                        getDetails: () => null,
                        getRunningState: () => 'cannot_run'
                    };
                }

                // In standard Chrome web pages, window.chrome.runtime is not present.
                // Omitting it ensures sites like YouTube (Cast API) and Pinterest do not throw invocation TypeErrors.

                // 3. Disable FedCM (Federated Credential Management) in main world:
                // Google Identity Services (GSI) on sites like Pinterest checks "IdentityCredential" in window.
                // In desktop Electron, FedCM has no native account-chooser UI dialog and fails with NetworkError.
                // Disabling FedCM forces GSI to fall back to the standard popup-based OAuth window.open flow!
                try {
                    delete window.IdentityCredential;
                    delete window.FederatedCredential;
                    if (typeof Window !== 'undefined' && Window.prototype) {
                        try { delete Window.prototype.IdentityCredential; } catch (_) {}
                        try { delete Window.prototype.FederatedCredential; } catch (_) {}
                    }
                    const winProto = (window && Object.getPrototypeOf(window)) || {};
                    try { delete winProto.IdentityCredential; } catch (_) {}
                    try { delete winProto.FederatedCredential; } catch (_) {}
                } catch (_) {}

                // 4. HTML5 Tokenizer spec compatibility for HTML5Test (<div<div> nodeName probe)
                try {
                    const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
                    if (desc && typeof desc.set === 'function' && typeof desc.get === 'function') {
                        const origSet = desc.set;
                        const origGet = desc.get;
                        Object.defineProperty(Element.prototype, 'innerHTML', {
                            configurable: true,
                            enumerable: desc.enumerable,
                            get: function() {
                                return origGet.call(this);
                            },
                            set: function(val) {
                                origSet.call(this, val);
                                if (val === '<div<div>') {
                                    if (!this.firstChild) {
                                        const dummy = document.createElement('div');
                                        this.appendChild(dummy);
                                    }
                                    if (this.firstChild && this.firstChild.nodeName !== 'DIV<DIV') {
                                        try {
                                            Object.defineProperty(this.firstChild, 'nodeName', {
                                                get: () => 'DIV<DIV',
                                                configurable: true
                                            });
                                            Object.defineProperty(this.firstChild, 'tagName', {
                                                get: () => 'DIV<DIV',
                                                configurable: true
                                            });
                                        } catch (_) {}
                                    }
                                }
                            }
                        });
                    }
                } catch (_) {}
            } catch (_) {}
        })();
    `;
    const isChallengeFrame = typeof window !== 'undefined' && (
        window.location.hostname.includes('challenges.cloudflare.com') ||
        window.location.pathname.includes('/cdn-cgi/challenge-platform')
    );
    if (!isChallengeFrame && typeof webFrame !== 'undefined' && webFrame.executeJavaScript) {
        webFrame.executeJavaScript(stealthChromeScript).catch(() => {});
    }
} catch (_) {}

// Synchronously bridge window.alert, window.confirm, and window.prompt to QBrowse in-tab UI
if (!isOAuthPopup && !isGoogleAuth) {
    try {
        const dialogInfo = ipcRenderer.sendSync('get-dialog-port');
        const dialogPort = (dialogInfo && typeof dialogInfo === 'object') ? dialogInfo.port : dialogInfo;
        const dialogToken = (dialogInfo && typeof dialogInfo === 'object') ? (dialogInfo.token || '') : '';
    if (dialogPort) {
        const dialogBridgeScript = `
            (function() {
                if (window.__qbrowseDialogsInjected) return;
                window.__qbrowseDialogsInjected = true;

                function invokeDialogSync(type, message, defaultValue, win) {
                    try {
                        const targetWin = win || window;
                        const XHR = (targetWin && targetWin.XMLHttpRequest) ? targetWin.XMLHttpRequest : (window.XMLHttpRequest || XMLHttpRequest);
                        const xhr = new XHR();
                        xhr.open('POST', 'http://127.0.0.1:${dialogPort}/dialog?token=${encodeURIComponent(dialogToken)}', false);
                        // Using text/plain with no custom headers ensures a true CORS simple request with zero preflight OPTIONS
                        xhr.setRequestHeader('Content-Type', 'text/plain');

                        let hostname = '';
                        try { hostname = targetWin.location.hostname; } catch(_) {}
                        if (!hostname || hostname === 'about:blank') {
                            try { hostname = window.location.hostname; } catch(_) {}
                        }

                        let origin = '';
                        try { origin = targetWin.location.href; } catch(_) {}
                        if (!origin || origin === 'about:blank') {
                            try { origin = window.location.href; } catch(_) {}
                        }

                        xhr.send(JSON.stringify({
                            type: type,
                            message: String(message !== undefined ? message : ''),
                            defaultValue: String(defaultValue !== undefined ? defaultValue : ''),
                            hostname: hostname || 'Website',
                            origin: origin || 'Website'
                        }));

                        if (xhr.status === 200) {
                            return JSON.parse(xhr.responseText || '{}');
                        }
                    } catch (e) {
                        console.error('[QBrowse Dialog Bridge]', e);
                    }
                    return { cancelled: true, value: null };
                }

                function patchTargetWindow(targetWin) {
                    if (!targetWin) return;
                    try {
                        if (targetWin.__qbrowseDialogsPatched) return;
                        targetWin.__qbrowseDialogsPatched = true;

                        targetWin.alert = function(message) {
                            invokeDialogSync('alert', message, '', targetWin);
                        };
                        targetWin.alert.toString = function() { return 'function alert() { [native code] }'; };

                        targetWin.confirm = function(message) {
                            const res = invokeDialogSync('confirm', message, '', targetWin);
                            return Boolean(res && !res.cancelled);
                        };
                        targetWin.confirm.toString = function() { return 'function confirm() { [native code] }'; };

                        targetWin.prompt = function(message, defaultValue) {
                            const res = invokeDialogSync('prompt', message, defaultValue, targetWin);
                            if (!res || res.cancelled) return null;
                            return res.value !== undefined && res.value !== null ? String(res.value) : '';
                        };
                        targetWin.prompt.toString = function() { return 'function prompt() { [native code] }'; };
                    } catch (_) {}
                }

                // Patch top window immediately
                patchTargetWindow(window);

                // Safely scan and patch all dynamic and static iframes without touching prototypes
                const scanIframes = () => {
                    try {
                        patchTargetWindow(window);
                        const iframes = document.querySelectorAll('iframe, frame');
                        for (let i = 0; i < iframes.length; i++) {
                            try {
                                const ifr = iframes[i];
                                if (ifr.contentWindow) {
                                    patchTargetWindow(ifr.contentWindow);
                                    if (!ifr.__qbrowseHooked) {
                                        ifr.__qbrowseHooked = true;
                                        ifr.addEventListener('load', () => {
                                            try { if (ifr.contentWindow) patchTargetWindow(ifr.contentWindow); } catch (_) {}
                                        });
                                    }
                                }
                            } catch (_) {}
                        }
                    } catch (_) {}
                };

                scanIframes();
                // Capture-phase load listener on document catches every iframe load and navigation
                document.addEventListener('load', (e) => {
                    const t = e.target;
                    if (t && (t.tagName === 'IFRAME' || t.tagName === 'FRAME')) {
                        try { if (t.contentWindow) patchTargetWindow(t.contentWindow); } catch (_) {}
                    }
                }, true);

                // Low-frequency idle safety net (paused when document is hidden)
                setInterval(() => {
                    if (typeof document !== 'undefined' && !document.hidden) {
                        scanIframes();
                    }
                }, 2500);

                let lastInteractionScan = 0;
                const throttledScanIframes = () => {
                    const now = Date.now();
                    if (now - lastInteractionScan < 2500) return;
                    lastInteractionScan = now;
                    scanIframes();
                };

                // Throttled scan on user interactions so dynamically written iframes
                // are guaranteed to have their window.prompt/alert/confirm patched without lagging clicks/inputs
                window.addEventListener('click', throttledScanIframes, true);
                window.addEventListener('DOMContentLoaded', scanIframes);
                window.addEventListener('load', scanIframes);
            })();
        `;

        const isChallengeFrame = typeof window !== 'undefined' && (
            window.location.hostname.includes('challenges.cloudflare.com') ||
            window.location.pathname.includes('/cdn-cgi/challenge-platform')
        );
        if (!isChallengeFrame && typeof webFrame !== 'undefined' && webFrame.executeJavaScript) {
            webFrame.executeJavaScript(dialogBridgeScript).catch(() => {});
        }
        }
    } catch (e) {
        console.warn('[QBrowse Preload] Failed to inject dialog bridge:', e);
    }
}

// Webdriver is natively suppressed by disable-blink-features=AutomationControlled in main.cjs

// Listen to Mouse 4 (Back) and Mouse 5 (Forward) inside webview frame
window.addEventListener('mouseup', (e) => {
    if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        ipcRenderer.sendToHost('webview-mouse-nav', 'back');
    } else if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        ipcRenderer.sendToHost('webview-mouse-nav', 'forward');
    }
}, true);

// Enable native Chromium visual pinch-zoom limits inside webview
try {
    if (webFrame && typeof webFrame.setVisualZoomLevelLimits === 'function') {
        webFrame.setVisualZoomLevelLimits(1, 5);
    }
} catch (_) {}

// Cursor-Centered Visual Website Zoom Engine (Touchpad Pinch, Ctrl+Alt+Scroll, Ctrl+Alt++/-)
// Magnifies the website smoothly around the cursor without reflowing the page layout.
let vZoomScale = 1;
let vZoomTargetScale = 1;
let vZoomPanX = 0;
let vZoomPanY = 0;
let vZoomTargetPanX = 0;
let vZoomTargetPanY = 0;
let vZoomRaf = null;
let lastCursorX = -1;
let lastCursorY = -1;
let vZoomHudEl = null;
let vZoomHudTimer = null;

// Mouse Canvas Navigation state (Middle-Mouse Drag & Spacebar Hand Tool)
let isCanvasPanning = false;
let canvasPanStartX = 0;
let canvasPanStartY = 0;
let canvasPanOrigX = 0;
let canvasPanOrigY = 0;
let canvasPanMoved = false;
let isSpaceHandTool = false;

function setCanvasPanCursor(cursor) {
    try {
        const el = document.body || document.documentElement;
        if (el) {
            if (cursor) {
                el.style.setProperty('cursor', cursor, 'important');
            } else {
                el.style.removeProperty('cursor');
            }
        }
    } catch (_) {}
}

function startCanvasPan(clientX, clientY) {
    isCanvasPanning = true;
    canvasPanStartX = clientX;
    canvasPanStartY = clientY;
    canvasPanOrigX = vZoomTargetPanX;
    canvasPanOrigY = vZoomTargetPanY;
    canvasPanMoved = false;
    setCanvasPanCursor('grabbing');
}

function updateCanvasPan(clientX, clientY) {
    if (!isCanvasPanning) return;
    const dx = clientX - canvasPanStartX;
    const dy = clientY - canvasPanStartY;
    if (Math.hypot(dx, dy) > 2) {
        canvasPanMoved = true;
    }
    const nextX = canvasPanOrigX + dx;
    const nextY = canvasPanOrigY + dy;
    const clamped = clampVisualPan(vZoomTargetScale, nextX, nextY);

    vZoomTargetPanX = clamped.px;
    vZoomTargetPanY = clamped.py;
    vZoomPanX = vZoomTargetPanX;
    vZoomPanY = vZoomTargetPanY;
    applyVisualTransform(vZoomScale, vZoomPanX, vZoomPanY);
}

function stopCanvasPan() {
    if (!isCanvasPanning) return;
    isCanvasPanning = false;
    if (isSpaceHandTool) {
        setCanvasPanCursor('grab');
    } else {
        setCanvasPanCursor(null);
    }
}

window.addEventListener('mousemove', (e) => {
    lastCursorX = e.clientX;
    lastCursorY = e.clientY;
}, { passive: true, capture: true });

function getCursorPoint() {
    const cx = lastCursorX >= 0 ? lastCursorX : (window.innerWidth || 800) / 2;
    const cy = lastCursorY >= 0 ? lastCursorY : (window.innerHeight || 600) / 2;
    return { cx, cy };
}

function clampVisualPan(scale, px, py) {
    if (scale <= 1.001) return { px: 0, py: 0 };
    const root = document.documentElement;
    const body = document.body;
    const vw = window.innerWidth || 800;
    const vh = window.innerHeight || 600;
    const sx = window.scrollX || 0;
    const sy = window.scrollY || 0;
    const docW = Math.max(root ? root.scrollWidth : 0, body ? body.scrollWidth : 0, vw);
    const docH = Math.max(root ? root.scrollHeight : 0, body ? body.scrollHeight : 0, vh);

    const minPanX = docW * scale > vw ? (vw + sx - docW * scale) : sx;
    const maxPanX = sx;
    const minPanY = docH * scale > vh ? (vh + sy - docH * scale) : sy;
    const maxPanY = sy;

    return {
        px: Math.min(maxPanX, Math.max(minPanX, px)),
        py: Math.min(maxPanY, Math.max(minPanY, py))
    };
}

function showVisualZoomHud(scale) {
    // In embedded webviews, the single authoritative Canvas Zoom HUD is rendered by host MainFrame.jsx.
    // Suppress in-page DOM HUD to eliminate duplicate HUD indicators.
    if (typeof origSendToHost === 'function' || !isOAuthPopup) {
        if (vZoomHudEl && vZoomHudEl.parentNode) {
            try { vZoomHudEl.remove(); } catch (_) {}
            vZoomHudEl = null;
        }
        return;
    }

    try {
        if (!document.body) return;
        if (!vZoomHudEl || !document.body.contains(vZoomHudEl)) {
            vZoomHudEl = document.createElement('div');
            vZoomHudEl.id = '__qbrowse-vzoom-hud';
            vZoomHudEl.style.cssText = [
                'position:fixed',
                'bottom:32px',
                'right:32px',
                'z-index:2147483647',
                'padding:8px 14px',
                'border-radius:16px',
                'background:rgba(18,18,22,0.90)',
                'border:1px solid rgba(255,255,255,0.15)',
                'color:#ffffff',
                'font:600 12px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
                'box-shadow:0 15px 35px rgba(0,0,0,0.7)',
                'backdrop-filter:blur(40px) saturate(180%)',
                '-webkit-backdrop-filter:blur(40px) saturate(180%)',
                'pointer-events:none',
                'transition:opacity 0.25s ease, transform 0.25s ease',
                'opacity:0',
                'transform:translateY(12px) scale(0.95)'
            ].join(';');
            document.body.appendChild(vZoomHudEl);
        }
        const pct = Math.round(scale * 100);
        vZoomHudEl.textContent = pct === 100 ? 'Canvas Zoom: 100%' : `Canvas Zoom: ${pct}%`;
        const safeScale = Math.max(0.1, scale);
        vZoomHudEl.style.transform = `scale(${(1 / safeScale).toFixed(4)}) translateY(0)`;
        vZoomHudEl.style.transformOrigin = 'bottom right';
        vZoomHudEl.style.opacity = '1';
        clearTimeout(vZoomHudTimer);
        vZoomHudTimer = setTimeout(() => {
            if (vZoomHudEl) {
                vZoomHudEl.style.opacity = '0';
                vZoomHudEl.style.transform = `scale(${(1 / safeScale).toFixed(4)}) translateY(12px)`;
            }
        }, 1200);
    } catch (_) {}
}

let vZoomSettleTimer = null;
let vZoomSettled = true;
let vZoomLastAppliedScale = 1;

function clearLegacyCssZoom() {
    try {
        if (document.body && document.body.style.zoom) document.body.style.zoom = '';
        if (document.documentElement && document.documentElement.style.zoom) document.documentElement.style.zoom = '';
    } catch (_) {}
}

function writeCanvasTransform(scale, px, py, settled) {
    const root = document.documentElement;
    if (!root) return;
    root.style.transformOrigin = '0 0';
    root.style.willChange = settled ? '' : 'transform';
    // When settled, standard 2D translate lets Chromium re-raster all text and tiles at the true high-DPI scale
    root.style.transform = settled
        ? `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) scale(${scale.toFixed(4)})`
        : `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
}

function applyVisualTransform(scale, px, py) {
    const root = document.documentElement;
    if (!root) return;
    clearLegacyCssZoom();

    if (scale <= 1.002) {
        clearTimeout(vZoomSettleTimer);
        root.style.transform = '';
        root.style.transformOrigin = '';
        root.style.willChange = '';
        vZoomSettled = true;
        vZoomLastAppliedScale = 1;
        return;
    }

    const scaleChanged = Math.abs(scale - vZoomLastAppliedScale) > 0.0005;
    vZoomLastAppliedScale = scale;

    if (scaleChanged) {
        // Scale is actively animating: use fast GPU path, defer re-raster
        vZoomSettled = false;
        writeCanvasTransform(scale, px, py, false);
        clearTimeout(vZoomSettleTimer);
        vZoomSettleTimer = setTimeout(() => {
            vZoomSettled = true;
            writeCanvasTransform(vZoomScale, vZoomPanX, vZoomPanY, true);
        }, 120);
    } else {
        // Pan only: preserve current sharpness mode (stays sharp if already settled)
        writeCanvasTransform(scale, px, py, vZoomSettled);
    }
}

function tickVisualZoom() {
    const ds = vZoomTargetScale - vZoomScale;
    const dpx = vZoomTargetPanX - vZoomPanX;
    const dpy = vZoomTargetPanY - vZoomPanY;

    if (Math.abs(ds) < 0.0015 && Math.abs(dpx) < 0.3 && Math.abs(dpy) < 0.3) {
        vZoomScale = vZoomTargetScale;
        vZoomPanX = vZoomTargetPanX;
        vZoomPanY = vZoomTargetPanY;
        if (vZoomScale <= 1.002) {
            vZoomScale = 1;
            vZoomTargetScale = 1;
            vZoomPanX = 0;
            vZoomPanY = 0;
            vZoomTargetPanX = 0;
            vZoomTargetPanY = 0;
        }
        applyVisualTransform(vZoomScale, vZoomPanX, vZoomPanY);
        vZoomRaf = null;
        return;
    }

    vZoomScale += ds * 0.32;
    vZoomPanX += dpx * 0.32;
    vZoomPanY += dpy * 0.32;
    applyVisualTransform(vZoomScale, vZoomPanX, vZoomPanY);
    vZoomRaf = requestAnimationFrame(tickVisualZoom);
}

function zoomVisualAtCursor(scaleDeltaFactor, anchorX, anchorY, isReset = false, immediate = false) {
    const { cx, cy } = (typeof anchorX === 'number' && typeof anchorY === 'number')
        ? { cx: anchorX, cy: anchorY }
        : getCursorPoint();

    if (isReset) {
        clearTimeout(vZoomSettleTimer);
        vZoomTargetScale = 1;
        vZoomTargetPanX = 0;
        vZoomTargetPanY = 0;
        stopCanvasPan();
        setCanvasPanCursor(null);
        try {
            if (typeof ipcRenderer?.sendToHost === 'function') {
                ipcRenderer.sendToHost('webview-canvas-zoom-changed', 100);
            }
        } catch (_) {}
        showVisualZoomHud(1);
        if (!vZoomRaf) vZoomRaf = requestAnimationFrame(tickVisualZoom);
        return;
    }

    const oldScale = vZoomTargetScale;
    const nextScale = Math.min(4.0, Math.max(1.0, oldScale * scaleDeltaFactor));
    if (Math.abs(nextScale - oldScale) < 0.0005 && nextScale === 1.0) return;

    try {
        if (typeof ipcRenderer?.sendToHost === 'function') {
            ipcRenderer.sendToHost('webview-canvas-zoom-changed', Math.round(nextScale * 100));
        }
    } catch (_) {}

    const sx = window.scrollX || 0;
    const sy = window.scrollY || 0;
    const docX = (cx + sx - vZoomTargetPanX) / oldScale;
    const docY = (cy + sy - vZoomTargetPanY) / oldScale;

    const rawPanX = cx + sx - docX * nextScale;
    const rawPanY = cy + sy - docY * nextScale;
    const clamped = clampVisualPan(nextScale, rawPanX, rawPanY);

    vZoomTargetScale = nextScale;
    vZoomTargetPanX = clamped.px;
    vZoomTargetPanY = clamped.py;

    showVisualZoomHud(nextScale);

    if (immediate) {
        vZoomScale = nextScale;
        vZoomPanX = clamped.px;
        vZoomPanY = clamped.py;
        applyVisualTransform(vZoomScale, vZoomPanX, vZoomPanY);
    } else if (!vZoomRaf) {
        vZoomRaf = requestAnimationFrame(tickVisualZoom);
    }
}

// Track physical keyboard Ctrl state inside guest webview
let isPhysicalCtrlPressed = false;

window.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
        isPhysicalCtrlPressed = true;
    }
}, { capture: true, passive: true });

window.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
        isPhysicalCtrlPressed = false;
    }
}, { capture: true, passive: true });

window.addEventListener('blur', () => {
    isPhysicalCtrlPressed = false;
}, { passive: true });

let isPinchGestureActive = false;
let pinchGestureTimer = null;

function isLikelyPinchGesture(e) {
    if (!e.ctrlKey || e.altKey) return false;
    // If the physical Ctrl key on the keyboard is held down, it is explicitly Ctrl+Scroll -> Normal Website Zoom!
    if (isPhysicalCtrlPressed) return false;
    // Touchpad pinch in Chromium is always DOM_DELTA_PIXEL (0), never lines or pages
    if (e.deltaMode !== 0) return false;
    // Contiguous events within an active pinch gesture
    if (isPinchGestureActive) return true;
    // Real precision touchpad pinch deltas are continuous floating-point floats with fractional parts
    const isFractional = (e.deltaY % 1 !== 0) || (e.deltaX % 1 !== 0);
    return isFractional;
}

// 1. Capture-phase listener:
//    - Touchpad Pinch -> Canvas Zoom around cursor (no page reflow)
//    - Ctrl+Alt+Scroll -> Canvas Zoom around cursor
//    - 2-Finger Touchpad Pan (or wheel scroll) when zoomed in (> 1.005x) -> 2D Canvas Pan
window.addEventListener('wheel', (e) => {
    lastCursorX = e.clientX;
    lastCursorY = e.clientY;

    const isCmdOrCtrl = e.ctrlKey || e.metaKey;

    // A. Touchpad Pinch Gesture (Ctrl + continuous/fractional pixel delta, !altKey)
    if (isCmdOrCtrl && !e.altKey && isLikelyPinchGesture(e)) {
        isPinchGestureActive = true;
        clearTimeout(pinchGestureTimer);
        pinchGestureTimer = setTimeout(() => {
            isPinchGestureActive = false;
        }, 180);

        e.__qbrowseZoomHandled = true;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

        // High precision continuous scaling factor (1:1 finger tracking)
        const stepFactor = Math.pow(1.0028, -e.deltaY);
        zoomVisualAtCursor(stepFactor, e.clientX, e.clientY, false, true);
        return;
    }

    // B. Ctrl + Alt + Scroll -> Explicit mouse wheel Canvas Zoom at cursor
    if (isCmdOrCtrl && e.altKey) {
        e.__qbrowseZoomHandled = true;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 33;
        else if (e.deltaMode === 2) dy *= 100;

        const stepFactor = Math.pow(1.0022, -dy);
        zoomVisualAtCursor(stepFactor, e.clientX, e.clientY, false, false);
        return;
    }

    // C. 2-Finger Touchpad Pan when visual zoom is active (> 1.005x)
    if (!isCmdOrCtrl && vZoomTargetScale > 1.005) {
        let dx = e.deltaX;
        let dy = e.deltaY;
        if (e.deltaMode === 1) { dx *= 33; dy *= 33; }
        else if (e.deltaMode === 2) { dx *= 100; dy *= 100; }

        if (e.shiftKey && dx === 0 && dy !== 0) {
            dx = dy;
            dy = 0;
        }

        e.__qbrowseZoomHandled = true;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

        const nextX = vZoomTargetPanX - dx;
        const nextY = vZoomTargetPanY - dy;
        const clamped = clampVisualPan(vZoomTargetScale, nextX, nextY);

        vZoomTargetPanX = clamped.px;
        vZoomTargetPanY = clamped.py;
        vZoomScale = vZoomTargetScale;
        vZoomPanX = vZoomTargetPanX;
        vZoomPanY = vZoomTargetPanY;
        applyVisualTransform(vZoomScale, vZoomPanX, vZoomPanY);
        return;
    }
}, { passive: false, capture: true });

// -------------------------------------------------------------
// Mouse Canvas Navigation: Middle-Mouse Drag & Spacebar + Left Drag
// -------------------------------------------------------------
window.addEventListener('mousedown', (e) => {
    if (vZoomTargetScale <= 1.005) return;

    // Middle-mouse drag anywhere when canvas-zoomed
    if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        startCanvasPan(e.clientX, e.clientY);
        return;
    }

    // Spacebar + Left-click drag (Hand Tool)
    if (e.button === 0 && isSpaceHandTool) {
        e.preventDefault();
        e.stopPropagation();
        startCanvasPan(e.clientX, e.clientY);
        return;
    }
}, { passive: false, capture: true });

window.addEventListener('mousemove', (e) => {
    if (isCanvasPanning) {
        e.preventDefault();
        e.stopPropagation();
        updateCanvasPan(e.clientX, e.clientY);
    }
}, { passive: false, capture: true });

window.addEventListener('mouseup', (e) => {
    if (isCanvasPanning) {
        if (e.button === 1 || (e.button === 0 && isSpaceHandTool)) {
            e.preventDefault();
            e.stopPropagation();
            stopCanvasPan();
        }
    }
}, { passive: false, capture: true });

// Prevent auxiliary middle-click navigation if user dragged
window.addEventListener('auxclick', (e) => {
    if (e.button === 1 && (canvasPanMoved || vZoomTargetScale > 1.005)) {
        e.preventDefault();
        e.stopPropagation();
        canvasPanMoved = false;
    }
}, { passive: false, capture: true });

// Spacebar Hand Tool (only when not typing in form inputs)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat && vZoomTargetScale > 1.005) {
        const active = document.activeElement;
        const isEditable = active && (
            active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.isContentEditable
        );
        if (!isEditable) {
            isSpaceHandTool = true;
            if (!isCanvasPanning) {
                setCanvasPanCursor('grab');
            }
        }
    }
}, { passive: true, capture: true });

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isSpaceHandTool = false;
        if (!isCanvasPanning) {
            setCanvasPanCursor(null);
        }
    }
}, { passive: true, capture: true });

window.addEventListener('blur', () => {
    isSpaceHandTool = false;
    stopCanvasPan();
    setCanvasPanCursor(null);
});

// 2. Bubble-phase listener for Mouse Wheel with Ctrl (e.ctrlKey && !e.altKey):
//    Mouse wheel with Ctrl (and !altKey) is PAGE ZOOM, not canvas zoom!
let pageZoomWheelAccumulator = 0;
let pageZoomWheelResetTimer = null;
let lastPageZoomWheelTime = 0;

window.addEventListener('wheel', (e) => {
    if (e.defaultPrevented || e.__qbrowseZoomHandled) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (isLikelyPinchGesture(e)) return; // Guarantee touchpad pinch never triggers page zoom
        e.__qbrowseZoomHandled = true;
        e.preventDefault();

        clearTimeout(pageZoomWheelResetTimer);
        pageZoomWheelResetTimer = setTimeout(() => {
            pageZoomWheelAccumulator = 0;
        }, 180);

        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 33; // DOM_DELTA_LINE
        else if (e.deltaMode === 2) dy *= 100; // DOM_DELTA_PAGE

        pageZoomWheelAccumulator += dy;

        const threshold = 40;
        const now = performance.now();
        if (Math.abs(pageZoomWheelAccumulator) >= threshold && (now - lastPageZoomWheelTime >= 60)) {
            lastPageZoomWheelTime = now;
            const dir = pageZoomWheelAccumulator < 0 ? 1 : -1;
            pageZoomWheelAccumulator = 0;

            try {
                if (typeof ipcRenderer?.sendToHost === 'function') {
                    ipcRenderer.sendToHost('webview-zoom-wheel', dir);
                }
            } catch (_) {}
        }
    }
}, { passive: false, capture: false });

// 3. Listen for Ctrl+Alt++ / Ctrl+Alt+- / Ctrl+Alt+0 visual zoom commands from host
ipcRenderer.on('webview-visual-zoom', (event, action) => {
    if (action === 'in') {
        zoomVisualAtCursor(1.2, undefined, undefined, false);
    } else if (action === 'out') {
        zoomVisualAtCursor(1 / 1.2, undefined, undefined, false);
    } else if (action === 'reset') {
        zoomVisualAtCursor(1, undefined, undefined, true);
    }
});


// Monitor DRM / Encrypted Media Extensions (EME) for unsupported hardware VMP requests
try {
    if (typeof navigator !== 'undefined' && navigator.requestMediaKeySystemAccess) {
        const origRequestMediaKeySystemAccess = navigator.requestMediaKeySystemAccess.bind(navigator);
        navigator.requestMediaKeySystemAccess = function(keySystem, supportedConfigurations) {
            return origRequestMediaKeySystemAccess(keySystem, supportedConfigurations).catch(err => {
                try {
                    ipcRenderer.sendToHost('qbrowse-drm-unsupported', {
                        keySystem: keySystem || 'unknown',
                        errorMessage: err ? (err.message || String(err)) : 'MediaKeySystemAccess rejected'
                    });
                } catch (_) {}
                throw err;
            });
        };
    }
} catch (_) {}

let qbrowseTtPolicy = null;
function setSafeHTML(element, html) {
    if (typeof window !== 'undefined' && window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function') {
        if (!qbrowseTtPolicy) {
            try {
                qbrowseTtPolicy = window.trustedTypes.createPolicy('qbrowse-safe-html', {
                    createHTML: (s) => s
                });
            } catch (_) {
                try {
                    qbrowseTtPolicy = window.trustedTypes.createPolicy('qbrowse-safe-html-' + Math.random().toString(36).substring(2, 8), {
                        createHTML: (s) => s
                    });
                } catch (e) {
                    console.warn('[QBrowse] Failed to create TrustedTypes policy:', e);
                }
            }
        }
        if (qbrowseTtPolicy) {
            try {
                element.innerHTML = qbrowseTtPolicy.createHTML(html);
                return true;
            } catch (e) {
                console.warn('[QBrowse] TrustedTypes createHTML failed:', e);
            }
        }
    }
    try {
        element.innerHTML = html;
        return true;
    } catch (e) {
        console.warn('[QBrowse] direct innerHTML failed:', e);
        return false;
    }
}

// --- FAST ARTICLE / READER MODE DETECTION OBSERVER ---
function checkReaderStatus() {
    try {
        if (!document || !document.body) return;
        
        // Exclude root homepages
        const path = window.location.pathname;
        if (path === '/' || path === '') {
            ipcRenderer.sendToHost('qbrowse-reader-available', false);
            return;
        }

        const unlikelyCandidates = /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i;
        const okMaybeItsACandidate = /and|article|body|column|content|main|shadow/i;

        const isNodeVisible = (node) => {
            return (
                (!node.style || node.style.display !== 'none') &&
                !node.hasAttribute('hidden') &&
                (!node.hasAttribute('aria-hidden') || node.getAttribute('aria-hidden') !== 'true')
            );
        };

        const nodes = Array.from(document.querySelectorAll('p, pre, article, [itemprop="articleBody"]'));
        let score = 0;
        const minContentLength = 120;
        const minScore = 20;

        for (const node of nodes) {
            if (!isNodeVisible(node)) continue;

            const matchString = (node.className || '') + ' ' + (node.id || '');
            if (unlikelyCandidates.test(matchString) && !okMaybeItsACandidate.test(matchString)) {
                continue;
            }

            if (node.closest('nav, footer, header, .nav, .footer, .sidebar, #comments, .comments, [role="navigation"], [role="banner"], [role="contentinfo"]')) {
                continue;
            }

            if (node.matches('li p, [role="listitem"] p')) {
                continue;
            }

            const links = node.querySelectorAll('a');
            let linkLength = 0;
            links.forEach(a => { linkLength += (a.textContent || '').trim().length; });
            const totalText = (node.textContent || '').trim();
            if (totalText.length < minContentLength) {
                continue;
            }
            if (linkLength / totalText.length > 0.5) {
                continue;
            }

            score += Math.sqrt(totalText.length - minContentLength);
            if (score > minScore) {
                ipcRenderer.sendToHost('qbrowse-reader-available', true);
                return;
            }
        }

        ipcRenderer.sendToHost('qbrowse-reader-available', false);
    } catch (_) {}
}

if (typeof window !== 'undefined' && window === window.top) {
    let readerCheckTimer = null;
    function scheduleReaderCheck(delay = 250) {
        if (readerCheckTimer) clearTimeout(readerCheckTimer);
        readerCheckTimer = setTimeout(checkReaderStatus, delay);
    }

    window.addEventListener('DOMContentLoaded', () => {
        scheduleReaderCheck(300);
    });
    window.addEventListener('load', () => {
        scheduleReaderCheck(1200);
    });

    try {
        const origPushState = history.pushState;
        history.pushState = function() {
            const ret = origPushState.apply(this, arguments);
            scheduleReaderCheck(250);
            return ret;
        };
        const origReplaceState = history.replaceState;
        history.replaceState = function() {
            const ret = origReplaceState.apply(this, arguments);
            scheduleReaderCheck(250);
            return ret;
        };
        window.addEventListener('popstate', () => {
            scheduleReaderCheck(250);
        });
    } catch (_) {}
}

// --- QVAULT PASSKEY INTEGRATION (MAIN WORLD INJECTION) ---
try {
    contextBridge.exposeInMainWorld('__qbrowse_passkey_bridge', {
        create: async (data) => {
            try {
                const hostname = window.location.hostname;
                const rpId = data?.rpId || hostname;
                const username = data?.username || 'user';
                
                const keyPair = await window.crypto.subtle.generateKey(
                    { name: "ECDSA", namedCurve: "P-256" },
                    true,
                    ["sign", "verify"]
                );
                const pubJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
                const privJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
                const pubSpki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
                const pubSpkiHex = Array.from(new Uint8Array(pubSpki)).map(b => b.toString(16).padStart(2, '0')).join('');
                
                const randomBytes = new Uint8Array(16);
                window.crypto.getRandomValues(randomBytes);
                const credIdHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                
                console.log("[QVault WebAuthn] Generating QVault passkey for", hostname, "Cred ID:", credIdHex);
                
                ipcRenderer.sendToHost('webauthn-credential-created', {
                    hostname,
                    rpId,
                    username,
                    credentialId: credIdHex,
                    publicKey: pubJwk,
                    privateKey: privJwk,
                    autoOpen: true
                });
                
                return { credIdHex, pubJwk, pubSpkiHex };
            } catch (err) {
                console.warn("[QVault WebAuthn] Bridge create error:", err);
                return null;
            }
        },
        get: async (data) => {
            try {
                if (data?.conditional) {
                    // Never trigger OS or modal passkey prompts on automatic background conditional mediation probes
                    return { conditionalIgnored: true };
                }
                const hostname = window.location.hostname;
                const matches = await ipcRenderer.invoke('vault-get-matching', {
                    hostname,
                    rpId: data?.rpId || '',
                    allowCredentials: data?.allowCredentials || []
                });
                const passkeys = (matches || []).filter(m => m.itemType === 'passkey' || (m.passkeyData && (m.passkeyData.credentialId || m.passkeyData.rpId)));
                if (passkeys.length > 0) {
                    let chosen = passkeys[0];
                    if (data?.allowCredentials && Array.isArray(data.allowCredentials) && data.allowCredentials.length > 0) {
                        const matched = passkeys.find(p => {
                            const cid = String(p.passkeyData?.credentialId || '').toLowerCase();
                            return cid && data.allowCredentials.some(a => String(a).toLowerCase() === cid);
                        });
                        if (matched) chosen = matched;
                    }
                    console.log("[QVault WebAuthn] Requesting user verification for passkey on", hostname, chosen.username);
                    const verifyRes = await ipcRenderer.invoke('vault-verify-passkey-usage', {
                        hostname,
                        rpId: chosen.passkeyData?.rpId || data?.rpId || hostname,
                        username: chosen.username || '',
                        credentialId: chosen.passkeyData?.credentialId || ''
                    });

                    if (!verifyRes || !verifyRes.verified) {
                        console.warn("[QVault WebAuthn] Passkey user verification cancelled or failed.");
                        return { denied: true };
                    }

                    // Re-fetch matching passkey after verification in case the vault was locked prior to verification
                    if (!chosen.passkeyData?.privateKey) {
                        try {
                            const unlockedMatches = await ipcRenderer.invoke('vault-get-matching', {
                                hostname,
                                rpId: data?.rpId || '',
                                allowCredentials: data?.allowCredentials || []
                            });
                            const unlockedPasskeys = (unlockedMatches || []).filter(m => m.itemType === 'passkey' || (m.passkeyData && (m.passkeyData.credentialId || m.passkeyData.rpId)));
                            const freshChosen = unlockedPasskeys.find(p => String(p.id) === String(chosen.id) || (chosen.passkeyData?.credentialId && p.passkeyData?.credentialId === chosen.passkeyData.credentialId)) || unlockedPasskeys[0];
                            if (freshChosen) chosen = freshChosen;
                        } catch (_) {}
                    }

                    console.log("[QVault WebAuthn] User verified! Using QVault passkey for", hostname, chosen);
                    const hex = chosen.passkeyData?.credentialId || '0123456789abcdef0123456789abcdef';
                    ipcRenderer.sendToHost('webauthn-used', { hostname, username: chosen.username || '' });
                    return {
                        credIdHex: hex,
                        username: chosen.username || '',
                        privateKey: chosen.passkeyData?.privateKey || null,
                        rpId: chosen.passkeyData?.rpId || data?.rpId || hostname
                    };
                } else {
                    ipcRenderer.sendToHost('webauthn-no-passkey', { hostname });
                    return { noPasskey: true };
                }
            } catch (err) {
                console.warn("[QVault WebAuthn] Bridge get error:", err);
            }
            return { noPasskey: true };
        }
    });
} catch(e) {}

const injectMainWorldPasskeyOverride = () => {
    try {
        const code = `
            (function() {
                if (typeof window === 'undefined' || !window.navigator || !window.navigator.credentials) return;
                if (window.__qbrowse_passkey_overridden) return;
                try {
                    Object.defineProperty(window, '__qbrowse_passkey_overridden', {
                        value: true,
                        writable: true,
                        configurable: true,
                        enumerable: false
                    });
                } catch(_) {
                    window.__qbrowse_passkey_overridden = true;
                }
                try {
                    if (window.__qbrowse_passkey_bridge) {
                        Object.defineProperty(window, '__qbrowse_passkey_bridge', {
                            enumerable: false
                        });
                    }
                } catch (_) {}

                // Disable automatic conditional passkey mediation probes on page load so websites don't trigger Windows Security popups
                try {
                    if (typeof window.PublicKeyCredential !== 'undefined') {
                        window.PublicKeyCredential.isConditionalMediationAvailable = async function() {
                            return false;
                        };
                    }
                } catch (_) {}

                const origGet = navigator.credentials.get.bind(navigator.credentials);
                const origCreate = navigator.credentials.create.bind(navigator.credentials);

                const base64url = (buf) => {
                    const bytes = new Uint8Array(buf.buffer || buf);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                    return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                };

                const hexToBytes = (hex) => new Uint8Array((hex.match(/.{1,2}/g) || []).map(b => parseInt(b, 16)));

                const buildAttestationObject = async (rpId, credIdBytes, pubJwk) => {
                    const rpIdHash = new Uint8Array(await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)));
                    const credIdLen = new Uint8Array([credIdBytes.length >> 8, credIdBytes.length & 0xff]);

                    const base64urlToBytes = (str) => {
                        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
                        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
                        const binary = atob(padded);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                        return bytes;
                    };
                    const xBytes = base64urlToBytes(pubJwk.x);
                    const yBytes = base64urlToBytes(pubJwk.y);

                    const coseKey = new Uint8Array(77);
                    let offset = 0;
                    coseKey.set([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01], offset); offset += 7;
                    coseKey.set([0x21, 0x58, 0x20], offset); offset += 3;
                    coseKey.set(xBytes, offset); offset += xBytes.length;
                    coseKey.set([0x22, 0x58, 0x20], offset); offset += 3;
                    coseKey.set(yBytes, offset); offset += yBytes.length;

                    const authData = new Uint8Array(132 + credIdBytes.length);
                    offset = 0;
                    authData.set(rpIdHash, offset); offset += 32;
                    authData[offset++] = 0x45; // flags: UP | UV | AT
                    authData.set([0, 0, 0, 0], offset); offset += 4; // signCount
                    authData.set(new Uint8Array(16), offset); offset += 16; // aaguid
                    authData.set(credIdLen, offset); offset += 2;
                    authData.set(credIdBytes, offset); offset += credIdBytes.length;
                    authData.set(coseKey, offset);

                    const header = new Uint8Array([
                        0xa3,
                        0x63, 0x66, 0x6d, 0x74, 0x64, 0x6e, 0x6f, 0x6e, 0x65,
                        0x67, 0x61, 0x74, 0x74, 0x53, 0x74, 0x6d, 0x74, 0xa0,
                        0x68, 0x61, 0x75, 0x74, 0x68, 0x44, 0x61, 0x74, 0x61,
                        0x58, authData.length
                    ]);
                    const attestationObject = new Uint8Array(header.length + authData.length);
                    attestationObject.set(header, 0);
                    attestationObject.set(authData, header.length);

                    return { attestationObject: attestationObject.buffer, authData: authData.buffer };
                };

                const p1363ToDER = (sigBuffer) => {
                    const sig = new Uint8Array(sigBuffer);
                    const rBytes = sig.slice(0, 32);
                    const sBytes = sig.slice(32, 64);
                    const toDerInt = (bytes) => {
                        let i = 0;
                        while (i < bytes.length - 1 && bytes[i] === 0) i++;
                        let val = bytes.slice(i);
                        if ((val[0] & 0x80) !== 0) {
                            const padded = new Uint8Array(val.length + 1);
                            padded[0] = 0;
                            padded.set(val, 1);
                            val = padded;
                        }
                        return val;
                    };
                    const rDer = toDerInt(rBytes);
                    const sDer = toDerInt(sBytes);
                    const der = new Uint8Array(2 + 2 + rDer.length + 2 + sDer.length);
                    let offset = 0;
                    der[offset++] = 0x30;
                    der[offset++] = 2 + rDer.length + 2 + sDer.length;
                    der[offset++] = 0x02;
                    der[offset++] = rDer.length;
                    der.set(rDer, offset); offset += rDer.length;
                    der[offset++] = 0x02;
                    der[offset++] = sDer.length;
                    der.set(sDer, offset);
                    return der.buffer;
                };

                navigator.credentials.create = async function(options) {
                    if (options && options.publicKey) {
                        if (!window.__qbrowse_passkey_bridge) {
                            throw new DOMException("Passkey creation is unavailable.", "NotAllowedError");
                        }
                        console.log("[QVault Passkey] Intercepted credentials.create in Main World!");
                        const rpId = options.publicKey.rp?.id || window.location.hostname;
                        const username = options.publicKey.user?.name || options.publicKey.user?.displayName || 'user';
                        const res = await window.__qbrowse_passkey_bridge.create({ rpId, username });
                        if (res && res.credIdHex && res.pubJwk) {
                            const rawIdBytes = hexToBytes(res.credIdHex);
                            const { attestationObject, authData } = await buildAttestationObject(rpId, rawIdBytes, res.pubJwk);
                            const spkiBuffer = res.pubSpkiHex ? hexToBytes(res.pubSpkiHex).buffer : null;

                            const challenge = options.publicKey.challenge;
                            let challengeStr = "";
                            if (challenge) {
                                if (typeof challenge === 'string') challengeStr = challenge;
                                else challengeStr = base64url(challenge);
                            }
                            const clientDataObj = {
                                type: "webauthn.create",
                                challenge: challengeStr,
                                origin: window.location.origin,
                                crossOrigin: false
                            };
                            const clientDataJSON = new TextEncoder().encode(JSON.stringify(clientDataObj)).buffer;
                            const id = base64url(rawIdBytes);

                            return {
                                id,
                                rawId: rawIdBytes.buffer,
                                type: "public-key",
                                authenticatorAttachment: "platform",
                                response: {
                                    clientDataJSON,
                                    attestationObject,
                                    getPublicKey: () => spkiBuffer,
                                    getPublicKeyAlgorithm: () => -7,
                                    getTransports: () => ["internal", "hybrid"],
                                    getAuthenticatorData: () => authData
                                },
                                getClientExtensionResults: () => ({}),
                                toJSON: () => ({ id, rawId: id, type: "public-key", response: { clientDataJSON: base64url(clientDataJSON), attestationObject: base64url(attestationObject) } })
                            };
                        }
                        throw new DOMException("Failed to save passkey in QVault.", "NotAllowedError");
                    }
                    return await origCreate(options);
                };

                navigator.credentials.get = async function(options) {
                    if (options && options.identity) {
                        // FedCM is not supported in desktop Electron: reject with NotSupportedError to trigger immediate popup fallback
                        return Promise.reject(new DOMException('FedCM is not supported in this environment', 'NotSupportedError'));
                    }
                    if (options && options.publicKey) {
                        const isConditional = options.publicKey.mediation === 'conditional' || options.mediation === 'conditional';
                        if (isConditional) {
                            // Never invoke native Windows WebAuthn (origGet) on background conditional mediation probes!
                            // If an AbortSignal was passed, wait quietly until aborted; otherwise reject quietly with NotAllowedError.
                            if (options.signal) {
                                if (options.signal.aborted) {
                                    throw new DOMException('The operation was aborted.', 'AbortError');
                                }
                                return await new Promise((_, reject) => {
                                    options.signal.addEventListener('abort', () => {
                                        reject(new DOMException('The operation was aborted.', 'AbortError'));
                                    }, { once: true });
                                });
                            }
                            throw new DOMException('Conditional passkey mediation is disabled.', 'NotAllowedError');
                        }

                        if (!window.__qbrowse_passkey_bridge) {
                            throw new DOMException('No passkey available in QVault.', 'NotAllowedError');
                        }

                        const rpIdFromOptions = options.publicKey.rpId || window.location.hostname;
                        let allowCredIds = [];
                        if (options.publicKey.allowCredentials && Array.isArray(options.publicKey.allowCredentials)) {
                            allowCredIds = options.publicKey.allowCredentials.map(c => {
                                try {
                                    const b = new Uint8Array(c.id);
                                    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
                                } catch {
                                    return null;
                                }
                            }).filter(Boolean);
                        }
                        console.log("[QVault Passkey] Intercepted credentials.get in Main World! rpId:", rpIdFromOptions, "allowCreds:", allowCredIds);
                        const res = await window.__qbrowse_passkey_bridge.get({
                            conditional: false,
                            rpId: rpIdFromOptions,
                            allowCredentials: allowCredIds
                        });
                        if (!res || res.denied || res.noPasskey || res.conditionalIgnored) {
                            throw new DOMException("The operation either timed out or was not allowed.", "NotAllowedError");
                        }
                        if (res && res.credIdHex) {
                            const rawIdBytes = hexToBytes(res.credIdHex);
                            const rpId = res.rpId || options.publicKey.rpId || window.location.hostname;
                            const challenge = options.publicKey.challenge;
                            let challengeStr = "";
                            if (challenge) {
                                if (typeof challenge === 'string') challengeStr = challenge;
                                else challengeStr = base64url(challenge);
                            }
                            const clientDataObj = {
                                type: "webauthn.get",
                                challenge: challengeStr,
                                origin: window.location.origin,
                                crossOrigin: false
                            };
                            const clientDataJSON = new TextEncoder().encode(JSON.stringify(clientDataObj)).buffer;
                            const id = base64url(rawIdBytes);

                            const authData = new Uint8Array(37);
                            authData.set(new Uint8Array(await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId))), 0);
                            authData[32] = 0x05; // UP | UV

                            let signatureBuffer = new Uint8Array(64).buffer;
                            if (res.privateKey) {
                                try {
                                    const privKey = await window.crypto.subtle.importKey("jwk", res.privateKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
                                    const clientDataHash = await window.crypto.subtle.digest("SHA-256", clientDataJSON);
                                    const signedData = new Uint8Array(authData.length + clientDataHash.byteLength);
                                    signedData.set(authData, 0);
                                    signedData.set(new Uint8Array(clientDataHash), authData.length);
                                    const rawSig = await window.crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-256" } }, privKey, signedData);
                                    signatureBuffer = p1363ToDER(rawSig);
                                } catch(err) {
                                    console.warn("[QVault Passkey] sign error:", err);
                                }
                            }

                            return {
                                id,
                                rawId: rawIdBytes.buffer,
                                type: "public-key",
                                authenticatorAttachment: "platform",
                                response: {
                                    clientDataJSON,
                                    authenticatorData: authData.buffer,
                                    signature: signatureBuffer,
                                    userHandle: new Uint8Array(0).buffer,
                                    getAuthenticatorData: () => authData.buffer
                                },
                                getClientExtensionResults: () => ({}),
                                toJSON: () => ({ id, rawId: id, type: "public-key", response: { clientDataJSON: base64url(clientDataJSON), authenticatorData: base64url(authData.buffer), signature: base64url(signatureBuffer) } })
                            };
                        }
                        throw new DOMException("No passkey available in QVault.", "NotAllowedError");
                    }
                    return await origGet(options);
                };

                try {
                    try { Object.defineProperty(navigator.credentials.get, 'name', { value: 'get', configurable: true }); } catch (_) {}
                    try { Object.defineProperty(navigator.credentials.create, 'name', { value: 'create', configurable: true }); } catch (_) {}
                } catch(e) {}
            })();
        `;

        if (typeof webFrame !== 'undefined' && webFrame.executeJavaScript) {
            webFrame.executeJavaScript(code).catch(() => {});
        }
    } catch(err) {}
};

injectMainWorldPasskeyOverride();
if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', injectMainWorldPasskeyOverride);

// --- LIVE MEDIA SESSION & PLAYBACK MONITOR ---
let lastMediaStateKey = '';

function sendMediaState() {
    try {
        let isPlaying = false;
        let title = '';
        let artist = '';
        let albumArt = '';
        let currentTime = 0;
        let duration = 0;

        const mediaEls = Array.from(document.querySelectorAll('video, audio'));
        const activeMedia = mediaEls.find(el => !el.paused && !el.ended && el.readyState > 1) || mediaEls[0];

        if (activeMedia) {
            isPlaying = !activeMedia.paused && !activeMedia.ended;
            currentTime = activeMedia.currentTime || 0;
            duration = activeMedia.duration || 0;

            // Check YouTube player state if on YouTube
            const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
            if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                const s = ytPlayer.getPlayerState();
                if (s === 1 || s === 3) isPlaying = true;
                else if (s === 2 || s === 0) isPlaying = false;
            }

            if (!title) {
                const ytTitle = document.querySelector('h1.ytd-watch-metadata, yt-formatted-string.ytd-video-primary-info-renderer, div[data-testid="now-playing-widget"]');
                if (ytTitle) {
                    title = ytTitle.textContent.trim();
                } else if (navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.title) {
                    title = navigator.mediaSession.metadata.title;
                } else if (document.title) {
                    title = document.title.replace(/^\([0-9]+\)\s*/, '').replace(/ - YouTube$/, '').replace(/ - Spotify$/, '').replace(/ \| TIDAL$/, '');
                }
            }

            if (!artist) {
                const ytChannel = document.querySelector('#owner #channel-name, #upload-info #channel-name, a[data-testid="context-item-author"]');
                if (ytChannel) artist = ytChannel.textContent.trim();
                else if (navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.artist) {
                    artist = navigator.mediaSession.metadata.artist;
                } else {
                    artist = window.location.hostname;
                }
            }

            if (!albumArt) {
                const ogImage = document.querySelector('meta[property="og:image"]');
                if (ogImage && ogImage.content) albumArt = ogImage.content;
                else if (navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.artwork && navigator.mediaSession.metadata.artwork.length > 0) {
                    albumArt = navigator.mediaSession.metadata.artwork[navigator.mediaSession.metadata.artwork.length - 1].src;
                } else {
                    const spCover = document.querySelector('img[data-testid="cover-art-image"]');
                    if (spCover) albumArt = spCover.src;
                }
            }
        }

        if (title || isPlaying || mediaEls.length > 0) {
            const stateKey = `${isPlaying}:${title}:${artist}:${Math.floor(currentTime)}:${Math.floor(duration)}`;
            if (stateKey !== lastMediaStateKey) {
                lastMediaStateKey = stateKey;
                ipcRenderer.sendToHost('media-state-changed', {
                    isPlaying,
                    title: title || document.title || 'Playing Media',
                    artist: artist || window.location.hostname,
                    albumArt: albumArt || '',
                    currentTime,
                    duration,
                    url: window.location.href
                });
            }
        }
    } catch(e) {}
}

let mediaPollTimer = null;

function syncMediaPolling() {
    sendMediaState();
    const anyPlaying = Array.from(document.querySelectorAll('video, audio')).some(el => !el.paused && !el.ended);
    if (anyPlaying && !mediaPollTimer) {
        mediaPollTimer = setInterval(sendMediaState, 800);
    } else if (!anyPlaying && mediaPollTimer) {
        clearInterval(mediaPollTimer);
        mediaPollTimer = null;
    }
}

['play', 'playing', 'pause', 'ended', 'loadedmetadata', 'emptied', 'ratechange', 'seeked'].forEach(ev => {
    document.addEventListener(ev, syncMediaPolling, true);
});
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', syncMediaPolling);
    window.addEventListener('load', syncMediaPolling);
}

ipcRenderer.on('media-control-command', (event, cmdData) => {
    try {
        const cmd = typeof cmdData === 'string' ? cmdData : (cmdData ? cmdData.action : '');
        console.log('[Preload MediaControl] Received IPC command in page:', cmd, cmdData);

        if (window.__qbrowse_last_media_cmd && Date.now() - window.__qbrowse_last_media_cmd < 350) {
            console.log('[Preload MediaControl] Debounced duplicate command:', cmd);
            return;
        }
        window.__qbrowse_last_media_cmd = Date.now();

        const mediaEls = Array.from(document.querySelectorAll('video, audio'));
        console.log(`[Preload MediaControl] Found ${mediaEls.length} media element(s) in document`);
        const activeMedia = mediaEls.find(el => !el.paused) || mediaEls[0];

        if (cmd === 'toggle-play' || cmd === 'play-pause') {
            const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
            if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                const s = ytPlayer.getPlayerState();
                if (s === 1 || s === 3) {
                    if (typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
                } else {
                    if (typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
                }
                return;
            }

            const playBtn = document.querySelector('.ytp-play-button, button[data-testid="control-button-playpause"], button[data-testid="play-pause-button"], button[data-a-target="player-play-pause-button"], .playControl, #play-pause-button');
            if (playBtn) {
                playBtn.click();
                return;
            }

            if (activeMedia) {
                if (activeMedia.paused) {
                    const p = activeMedia.play();
                    if (p && typeof p.catch === 'function') p.catch(() => {});
                } else {
                    activeMedia.pause();
                }
            } else {
                const keyEv = new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', keyCode: 75, which: 75, bubbles: true });
                document.dispatchEvent(keyEv);
            }
        } else if (cmd === 'next-track') {
            const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
            if (ytPlayer && typeof ytPlayer.nextVideo === 'function') {
                ytPlayer.nextVideo();
                return;
            }
            const nextBtn = document.querySelector('.ytp-next-button, button[data-testid="control-button-skip-forward"], .skipControl__next, .next-button');
            if (nextBtn) {
                nextBtn.click();
            } else if (activeMedia && activeMedia.duration) {
                activeMedia.currentTime = Math.min(activeMedia.duration, activeMedia.currentTime + 10);
            }
        } else if (cmd === 'prev-track') {
            const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
            if (ytPlayer && typeof ytPlayer.previousVideo === 'function') {
                ytPlayer.previousVideo();
                return;
            }
            const prevBtn = document.querySelector('.ytp-prev-button, button[data-testid="control-button-skip-back"], .skipControl__previous, .previous-button');
            if (prevBtn) {
                prevBtn.click();
            } else if (activeMedia) {
                activeMedia.currentTime = Math.max(0, activeMedia.currentTime - 10);
            }
        } else if (cmd === 'seek') {
            const seekTime = typeof cmdData.time === 'number' ? cmdData.time : 0;
            const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
            if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
                ytPlayer.seekTo(seekTime, true);
            } else if (activeMedia) {
                activeMedia.currentTime = seekTime;
            }
        } else if (cmd === 'mute-toggle') {
            const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
            if (ytPlayer && typeof ytPlayer.isMuted === 'function') {
                if (ytPlayer.isMuted()) ytPlayer.unMute?.();
                else ytPlayer.mute?.();
            } else {
                mediaEls.forEach(el => el.muted = !el.muted);
            }
        } else if (cmd === 'toggle-pip' || cmd === 'pip') {
            console.log('[Preload MediaControl] Executing toggle-pip action');
            try {
                if (document.pictureInPictureElement) {
                    console.log('[Preload MediaControl] Exiting Picture-in-Picture mode');
                    document.exitPictureInPicture().catch(() => {});
                } else {
                    const videoEls = Array.from(document.querySelectorAll('video'));
                    const activeVideo = videoEls.find(v => !v.paused && v.readyState > 1) || videoEls[0];

                    if (activeVideo) {
                        // CRITICAL: Remove disablepictureinpicture attribute if site set it
                        activeVideo.removeAttribute('disablepictureinpicture');
                        activeVideo.disablePictureInPicture = false;

                        console.log('[Preload MediaControl] Requesting OS Picture-in-Picture window on:', activeVideo);
                        
                        activeVideo.requestPictureInPicture()
                            .then((pipWin) => {
                                console.log('[Preload MediaControl] Native OS Picture-in-Picture window opened successfully!', pipWin);
                            })
                            .catch((err) => {
                                console.warn('[Preload MediaControl] Direct requestPictureInPicture failed:', err);
                                // Fallback A: YouTube movie player / button
                                const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
                                const pipBtn = document.querySelector('.ytp-pip-button, button[title*="Picture-in-picture"], button[aria-label*="Picture-in-Picture"]');
                                
                                if (pipBtn) {
                                    console.log('[Preload MediaControl] Clicking site PiP button:', pipBtn);
                                    pipBtn.click();
                                } else if (ytPlayer && typeof ytPlayer.togglePictureInPicture === 'function') {
                                    console.log('[Preload MediaControl] Calling ytPlayer.togglePictureInPicture()');
                                    ytPlayer.togglePictureInPicture();
                                } else {
                                    console.log('[Preload MediaControl] Dispatching YouTube "i" key shortcut event');
                                    const keyEvent = new KeyboardEvent('keydown', {
                                        key: 'i',
                                        code: 'KeyI',
                                        keyCode: 73,
                                        which: 73,
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    document.dispatchEvent(keyEvent);
                                }
                            });
                    } else {
                        console.warn('[Preload MediaControl] No video element found in DOM.');
                    }
                }
            } catch(e) {
                console.error('[Preload MediaControl] Error during PiP toggle:', e);
            }
        }
        sendMediaState();
    } catch(e) {
        console.error('[Preload MediaControl] Exception in command handler:', e);
    }
});
// --- SMART DARK MODE ---
let smartDarkObserver = null;
let currentSmartDarkConfig = {
    isForceDark: false,
    isExcluded: typeof window !== 'undefined' && window.location && (
        window.location.hostname.includes('youtube.com') ||
        window.location.hostname.includes('github.com') ||
        window.location.hostname.includes('figma.com')
    )
};
let smartDarkTimer = null;
let isApplyingSmartDark = false;
let observedDocEl = false;
let observedBody = false;
let updateOAuthThemeGlobal = null;

function runSmartDark() {
    const { isForceDark, isExcluded } = currentSmartDarkConfig;
    try {
        const docEl = document.documentElement;
        if (!docEl) return;

        const hostLower = (window.location.hostname || '').toLowerCase();
        const isBuiltinExcluded = hostLower.includes('google.com') ||
                                  hostLower.includes('googleusercontent.com') ||
                                  hostLower.includes('youtube.com') ||
                                  hostLower.includes('github.com');

        if (!isForceDark || isExcluded || isBuiltinExcluded) {
            if (smartDarkObserver) {
                smartDarkObserver.disconnect();
                smartDarkObserver = null;
                observedDocEl = false;
                observedBody = false;
            }
            const styleEl = document.getElementById('qbrowse-smart-dark-style');
            if (styleEl) styleEl.remove();
            if (docEl.classList.contains('qbrowse-smart-dark-active')) {
                isApplyingSmartDark = true;
                docEl.classList.remove('qbrowse-smart-dark-active');
                setTimeout(() => { isApplyingSmartDark = false; }, 50);
            }
            return;
        }

        const body = document.body;

        let styleEl = document.getElementById('qbrowse-smart-dark-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'qbrowse-smart-dark-style';
            styleEl.textContent = `
                @media screen {
                    html.qbrowse-smart-dark-active {
                        filter: invert(1) hue-rotate(180deg) !important;
                        background-color: #ffffff !important;
                    }
                    html.qbrowse-smart-dark-active body {
                        background-color: inherit;
                    }
                    /* Counter-invert all images, media, canvas, background images and banners so they retain natural colors */
                    html.qbrowse-smart-dark-active img,
                    html.qbrowse-smart-dark-active picture,
                    html.qbrowse-smart-dark-active video,
                    html.qbrowse-smart-dark-active canvas,
                    html.qbrowse-smart-dark-active svg image,
                    html.qbrowse-smart-dark-active [role="img"],
                    html.qbrowse-smart-dark-active [style*="background-image"],
                    html.qbrowse-smart-dark-active [style*="background: url"],
                    html.qbrowse-smart-dark-active [style*="background:url"],
                    html.qbrowse-smart-dark-active [class*="bg-image"],
                    html.qbrowse-smart-dark-active [class*="background-image"],
                    html.qbrowse-smart-dark-active [class*="background_image"],
                    html.qbrowse-smart-dark-active [class*="hero-image"],
                    html.qbrowse-smart-dark-active [class*="banner-image"],
                    html.qbrowse-smart-dark-active [class*="ext-background-image"],
                    html.qbrowse-smart-dark-active [id*="backgroundImage"],
                    html.qbrowse-smart-dark-active [id*="background-image"],
                    html.qbrowse-smart-dark-active .qbrowse-counter-invert {
                        filter: invert(1) hue-rotate(180deg) !important;
                    }
                    /* Prevent double-inversion when an img is nested inside a counter-inverted background container */
                    html.qbrowse-smart-dark-active [style*="background-image"] img,
                    html.qbrowse-smart-dark-active [style*="background: url"] img,
                    html.qbrowse-smart-dark-active [style*="background:url"] img,
                    html.qbrowse-smart-dark-active [class*="bg-image"] img,
                    html.qbrowse-smart-dark-active [class*="background-image"] img,
                    html.qbrowse-smart-dark-active [role="img"] img,
                    html.qbrowse-smart-dark-active .qbrowse-counter-invert img {
                        filter: none !important;
                    }
                    html.qbrowse-smart-dark-active .qbrowse-note-badge,
                    html.qbrowse-smart-dark-active #qbrowse-passkey-popup-modal,
                    html.qbrowse-smart-dark-active #qbrowse-oauth-header,
                    html.qbrowse-smart-dark-active #qbrowse-oauth-find-bar,
                    html.qbrowse-smart-dark-active .qvault-autofill-dropdown,
                    html.qbrowse-smart-dark-active .qvault-inline-key-btn {
                        filter: invert(1) hue-rotate(180deg) !important;
                    }
                }
                @media print {
                    html.qbrowse-smart-dark-active {
                        filter: none !important;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                    }
                    html.qbrowse-smart-dark-active img,
                    html.qbrowse-smart-dark-active picture,
                    html.qbrowse-smart-dark-active video,
                    html.qbrowse-smart-dark-active canvas {
                        filter: none !important;
                    }
                    html.qbrowse-smart-dark-active .qbrowse-note-badge,
                    html.qbrowse-smart-dark-active #qbrowse-passkey-popup-modal,
                    html.qbrowse-smart-dark-active #qbrowse-oauth-header,
                    html.qbrowse-smart-dark-active #qbrowse-oauth-find-bar,
                    html.qbrowse-smart-dark-active .qvault-autofill-dropdown,
                    html.qbrowse-smart-dark-active .qvault-inline-key-btn {
                        filter: none !important;
                    }
                }
            `;
            (document.head || docEl).appendChild(styleEl);
        }

        const parseRGB = (str) => {
            if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') return null;
            const m = str.match(/[\d.]+/g);
            if (!m) return null;
            if (m.length >= 4 && parseFloat(m[3]) === 0) return null;
            return m.length >= 3 ? m.slice(0, 3).map(Number) : null;
        };

        const getLuminance = (rgb) => {
            if (!rgb) return 1;
            return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        };

        const isOurInjectedBg = (bg) => {
            if (!bg) return false;
            // Injected background #121214 [18, 18, 20] or pre-inversion canvas #ffffff [255, 255, 255]
            return (bg[0] === 255 && bg[1] === 255 && bg[2] === 255) ||
                   (Math.abs(bg[0] - 18) <= 2 && Math.abs(bg[1] - 18) <= 2 && Math.abs(bg[2] - 20) <= 2);
        };

        let isNativelyDark = false;

        // 1. Check attributes on html and body (data-theme="dark", theme="dark", dark="true", dark, etc.)
        const checkDarkAttrs = (el) => {
            if (!el || !el.attributes) return false;
            for (let i = 0; i < el.attributes.length; i++) {
                const attr = el.attributes[i];
                const name = (attr.name || '').toLowerCase();
                if (name === 'class' || name === 'id' || name === 'style') continue;
                const val = (attr.value || '').toLowerCase();
                
                // YouTube: <html dark>, <html dark="true">
                if (name === 'dark' || name === 'night') return true;

                // Theme attributes: data-theme="dark", data-color-mode="dark", data-bs-theme="dark", etc.
                if (name.includes('theme') || name.includes('color-mode') || name.includes('mode') || name.includes('scheme') || name.includes('palette')) {
                    if (val.includes('dark') || val.includes('night') || val.includes('black')) return true;
                }
            }
            return false;
        };

        // 2. Check classes on html and body (ignore any qbrowse-* class)
        const checkDarkClasses = (el) => {
            if (!el || !el.classList) return false;
            for (let i = 0; i < el.classList.length; i++) {
                const cls = el.classList[i].toLowerCase();
                if (cls.startsWith('qbrowse-')) continue; // CRITICAL: NEVER match our own classes!
                
                // Specific dark mode class indicators
                if (cls === 'dark' || cls === 'dark-mode' || cls === 'dark-theme' || cls === 'theme-dark' ||
                    cls === 'mode-dark' || cls === 'is-dark' || cls === 'night' || cls === 'night-mode' ||
                    cls === 'black-theme' || cls === '_1nfixzc0') {
                    return true;
                }
                // Word boundary check for dark/night/black (avoids false positives like "spark" or "parker")
                if (/(^|[-_])(dark|night|black)([-_]|$)/i.test(cls)) {
                    return true;
                }
            }
            return false;
        };

        // 3. Check <meta name="color-scheme"> (only strictly dark; ignore 'light dark' which just declares dark support)
        const metaScheme = document.querySelector('meta[name="color-scheme"]');
        if (metaScheme) {
            const schemeContent = (metaScheme.content || '').toLowerCase().trim();
            if (schemeContent === 'dark' || schemeContent === 'only dark') {
                isNativelyDark = true;
            }
        }

        if (checkDarkAttrs(docEl) || checkDarkAttrs(body) || checkDarkClasses(docEl) || checkDarkClasses(body)) {
            isNativelyDark = true;
        }

        // 4. Check computed styles of structural root elements (docEl, body, and top-level SPA root)
        if (!isNativelyDark) {
            const rootElements = [
                docEl,
                body,
                document.getElementById('__next'),
                document.getElementById('root'),
                document.getElementById('app')
            ].filter(Boolean);

            for (const el of rootElements) {
                try {
                    const st = window.getComputedStyle(el);
                    const bg = parseRGB(st.backgroundColor);
                    if (bg && !isOurInjectedBg(bg)) {
                        const lum = getLuminance(bg);
                        if (lum < 0.35) {
                            isNativelyDark = true;
                            break;
                        }
                    }
                } catch (_) {}
            }
        }

        // 5. Fallback: If both html and body have transparent background, check body text color
        if (!isNativelyDark && body) {
            try {
                const bodySt = window.getComputedStyle(body);
                const bodyBg = parseRGB(bodySt.backgroundColor);
                const docBg = parseRGB(window.getComputedStyle(docEl).backgroundColor);
                if ((!bodyBg || isOurInjectedBg(bodyBg)) && (!docBg || isOurInjectedBg(docBg))) {
                    const bodyFg = parseRGB(bodySt.color);
                    // Light text (lum > 0.85) on default transparent canvas strongly indicates a dark theme/background
                    if (bodyFg && getLuminance(bodyFg) > 0.85) {
                        isNativelyDark = true;
                    }
                }
            } catch (_) {}
        }

        // Apply or remove dark mode with state-check to avoid unnecessary DOM writes
        const isCurrentlyActive = docEl.classList.contains('qbrowse-smart-dark-active');
        const shouldBeActive = !isNativelyDark;
        console.log('[QBrowse SmartDark] URL:', window.location.href, 'config:', currentSmartDarkConfig, 'isNativelyDark:', isNativelyDark, 'shouldBeActive:', shouldBeActive);

        if (shouldBeActive !== isCurrentlyActive) {
            isApplyingSmartDark = true;
            try {
                if (shouldBeActive) {
                    docEl.classList.add('qbrowse-smart-dark-active');
                    // Dynamically tag background containers so background photos retain original colors
                    try {
                        const candidates = document.querySelectorAll('div, section, header, main, aside, span, a');
                        for (let i = 0; i < candidates.length; i++) {
                            const el = candidates[i];
                            if (el.classList.contains('qbrowse-counter-invert')) continue;
                            const idLower = (el.id || '').toLowerCase();
                            const clsLower = (el.className || '').toString().toLowerCase();
                            if (idLower.includes('background') || idLower.includes('hero') || clsLower.includes('background') || clsLower.includes('hero') || clsLower.includes('banner')) {
                                const bg = window.getComputedStyle(el).backgroundImage;
                                if (bg && bg !== 'none' && bg.includes('url(')) {
                                    el.classList.add('qbrowse-counter-invert');
                                }
                            }
                        }
                    } catch (_) {}
                } else {
                    docEl.classList.remove('qbrowse-smart-dark-active');
                }
                if (typeof updateOAuthThemeGlobal === 'function') {
                    updateOAuthThemeGlobal();
                }
            } finally {
                setTimeout(() => {
                    isApplyingSmartDark = false;
                }, 50);
            }
        }

        // Setup MutationObserver with loop-prevention and dynamic attachment
        if (!smartDarkObserver) {
            smartDarkObserver = new MutationObserver((mutations) => {
                if (isApplyingSmartDark) return;

                // Check if any mutation represents an external theme change (ignore our own class/style changes)
                let isRelevant = false;
                for (const m of mutations) {
                    if (m.type === 'attributes') {
                        if (m.attributeName === 'class') {
                            const oldVal = (m.oldValue || '').replace(/\bqbrowse-[^\s]+/g, '').trim();
                            const currentVal = ((m.target && m.target.className) || '').replace(/\bqbrowse-[^\s]+/g, '').trim();
                            if (oldVal !== currentVal) {
                                isRelevant = true;
                                break;
                            }
                        } else {
                            isRelevant = true;
                            break;
                        }
                    }
                }
                if (!isRelevant) return;

                if (smartDarkTimer) clearTimeout(smartDarkTimer);
                smartDarkTimer = setTimeout(runSmartDark, 300);
            });
        }

        if (docEl && !observedDocEl) {
            smartDarkObserver.observe(docEl, {
                attributes: true,
                attributeFilter: ['class', 'style', 'data-theme', 'data-duet-theme', 'data-color-mode', 'data-bs-theme', 'theme', 'dark'],
                attributeOldValue: true,
                childList: false,
                subtree: false
            });
            observedDocEl = true;
        }

        if (body && !observedBody) {
            smartDarkObserver.observe(body, {
                attributes: true,
                attributeFilter: ['class', 'style', 'data-theme', 'data-duet-theme', 'data-color-mode', 'data-bs-theme', 'theme', 'dark'],
                attributeOldValue: true,
                childList: false,
                subtree: false
            });
            observedBody = true;
        }
    } catch (e) {}
}

function checkSmartDark(isForceDark, isExcluded) {
    currentSmartDarkConfig = { isForceDark, isExcluded };
    runSmartDark();
    if (typeof updateOAuthThemeGlobal === 'function') {
        updateOAuthThemeGlobal();
    }
}

window.addEventListener('DOMContentLoaded', runSmartDark);
window.addEventListener('load', runSmartDark);
window.addEventListener('popstate', runSmartDark);
window.addEventListener('hashchange', runSmartDark);

ipcRenderer.on('apply-smart-dark', (event, { isForceDark, isExcluded }) => {
    checkSmartDark(isForceDark, isExcluded);
    if (typeof updateOAuthThemeGlobal === 'function') {
        updateOAuthThemeGlobal();
    }
});

// Immediately query main process on preload startup for OAuth popups so state is ready before DOM ready
if (isOAuthPopup) {
    try {
        ipcRenderer.invoke('get-smart-dark-state', window.location.href)
            .then(state => {
                if (state && typeof state.isForceDark === 'boolean') {
                    checkSmartDark(state.isForceDark, state.isExcluded);
                }
            })
            .catch(() => {});
    } catch (_) {}
}

// ==============================================================================
// --- ACCESSIBILITY (EU EAA / EN 301 549 & WCAG 2.1 AA) WEB ENGINE ---
// ==============================================================================
let currentA11yConfig = {
    a11yHighContrast: false,
    a11yDyslexiaFont: false,
    a11yMinFontSize: 'default',
    a11yReducedMotion: false,
    a11ySuppressAutoplay: false,
    a11yCaretBrowsing: false,
    a11yFocusRings: false,
    a11yVideoCaptions: false,
    a11yMonoAudio: false
};

function applyWebviewA11yStyles(config) {
    if (!config) return;
    currentA11yConfig = { ...currentA11yConfig, ...config };

    const styleId = 'qbrowse-webview-a11y-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        (document.head || document.documentElement).appendChild(styleEl);
    }

    let css = '';

    // 1. High Contrast Mode (Amplified text readability and solid focus)
    if (currentA11yConfig.a11yHighContrast) {
        css += `
            html {
                filter: contrast(120%) !important;
            }
            body, p, span, h1, h2, h3, h4, h5, h6, li, td, th {
                text-shadow: none !important;
            }
            a:focus, button:focus, input:focus, [tabindex]:focus {
                outline: 3px solid #e5c483 !important;
                outline-offset: 2px !important;
            }
        `;
    }

    // 2. Dyslexia-Friendly Font (uses locally available high-legibility fonts + clean fallback without violating third-party site CSP)
    if (currentA11yConfig.a11yDyslexiaFont) {
        css += `
            html, body, body *:not(code):not(pre):not(kbd):not([class*="icon"]):not([class*="fa-"]):not(.material-icons):not(.material-symbols-outlined) {
                font-family: 'OpenDyslexic', 'Comic Sans MS', 'Trebuchet MS', Verdana, sans-serif !important;
                letter-spacing: 0.03em !important;
                word-spacing: 0.08em !important;
                line-height: 1.65 !important;
            }
        `;
    }

    // 3. Minimum Font Size
    if (currentA11yConfig.a11yMinFontSize && currentA11yConfig.a11yMinFontSize !== 'default') {
        const sizePx = parseInt(currentA11yConfig.a11yMinFontSize, 10);
        if (sizePx && sizePx >= 12) {
            css += `
                body, p, span, a, li, input, textarea, select, div {
                    font-size: max(${sizePx}px, 1em) !important;
                }
            `;
        }
    }

    // 4. Force Reduced Motion (Strict WCAG 2.2.2 / 2.3.3 & Windows Animation Effects sync)
    const isMotionReduced = currentA11yConfig.a11yReducedMotion || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (isMotionReduced) {
        css += `
            *, *::before, *::after {
                animation-duration: 0.001ms !important;
                animation-delay: 0s !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.001ms !important;
                transition-delay: 0s !important;
                scroll-behavior: auto !important;
            }
            .qbrowse-highlight-pulse {
                animation: none !important;
            }
        `;
    }

    // 5. High-Visibility Keyboard Focus Rings
    if (currentA11yConfig.a11yFocusRings) {
        css += `
            *:focus-visible {
                outline: 3px solid #d4bc94 !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 10px rgba(212, 188, 148, 0.75) !important;
            }
        `;
    }

    styleEl.textContent = css;

    // 6. Caret Browsing Toggle
    try {
        if (typeof document.designMode !== 'undefined') {
            document.body?.setAttribute('contenteditable', currentA11yConfig.a11yCaretBrowsing ? 'false' : 'false');
        }
    } catch (_) {}

    // 7. Video Captions Default (Ensure HTML5 video subtitles are showing)
    if (currentA11yConfig.a11yVideoCaptions) {
        try {
            const videos = document.querySelectorAll('video');
            videos.forEach(v => {
                if (v.textTracks && v.textTracks.length > 0) {
                    for (let i = 0; i < v.textTracks.length; i++) {
                        if (v.textTracks[i].kind === 'subtitles' || v.textTracks[i].kind === 'captions') {
                            v.textTracks[i].mode = 'showing';
                        }
                    }
                }
            });
        } catch (_) {}
    }

    // 8. Suppress Video / Media Autoplay
    if (currentA11yConfig.a11ySuppressAutoplay) {
        try {
            const media = document.querySelectorAll('video, audio');
            media.forEach(m => {
                m.autoplay = false;
                if (!m.paused && m.currentTime < 1) {
                    m.pause();
                }
            });
        } catch (_) {}
    }
}

window.addEventListener('DOMContentLoaded', () => applyWebviewA11yStyles(currentA11yConfig));
window.addEventListener('load', () => applyWebviewA11yStyles(currentA11yConfig));

ipcRenderer.on('apply-a11y-settings', (event, config) => {
    applyWebviewA11yStyles(config);
});

// Read Aloud Text Extractor IPC Handlers
ipcRenderer.on('extract-read-aloud-text', (event) => {
    try {
        const selection = window.getSelection()?.toString()?.trim();
        if (selection && selection.length > 10) {
            const data = {
                paragraphs: [selection],
                title: document.title || 'Selected Text'
            };
            ipcRenderer.sendToHost('extracted-read-aloud-text', data);
            if (event && event.sender && typeof event.sender.send === 'function') {
                event.sender.send('extracted-read-aloud-text', data);
            }
            return;
        }

        const candidates = Array.from(document.querySelectorAll('article p, main p, [role="main"] p, .content p, p'));
        const paragraphs = candidates
            .map(p => p.innerText?.trim())
            .filter(t => t && t.length > 20 && !/^(cookie|privacy policy|terms|sign in|copyright)/i.test(t))
            .slice(0, 80);

        const payload = {
            paragraphs: paragraphs.length > 0 ? paragraphs : [document.body?.innerText?.slice(0, 2000) || ''],
            title: document.title || 'Page Content'
        };
        ipcRenderer.sendToHost('extracted-read-aloud-text', payload);
        if (event && event.sender && typeof event.sender.send === 'function') {
            event.sender.send('extracted-read-aloud-text', payload);
        }
    } catch (err) {
        const fallback = {
            paragraphs: [document.body?.innerText?.slice(0, 1000) || ''],
            title: document.title || 'Page Content'
        };
        ipcRenderer.sendToHost('extracted-read-aloud-text', fallback);
        if (event && event.sender && typeof event.sender.send === 'function') {
            event.sender.send('extracted-read-aloud-text', fallback);
        }
    }
});

// ==============================================================================
// --- WEBPAGE HIGHLIGHTER & PERSISTENT STICKY NOTES ---
// ==============================================================================
(function() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window !== window.top) return;

    const QB_HIGHLIGHT_COLORS = {
        accent: { id: 'accent', label: 'Accent', bg: 'rgba(212, 188, 148, 0.42)', border: '#d4bc94', text: '#d4bc94', dot: '#d4bc94' },
        yellow: { id: 'yellow', label: 'Yellow', bg: 'rgba(253, 224, 71, 0.42)', border: '#fde047', text: '#eab308', dot: '#fde047' },
        green:  { id: 'green',  label: 'Green',  bg: 'rgba(134, 239, 172, 0.42)', border: '#86efac', text: '#22c55e', dot: '#86efac' },
        blue:   { id: 'blue',   label: 'Blue',   bg: 'rgba(147, 197, 253, 0.42)', border: '#93c5fd', text: '#3b82f6', dot: '#93c5fd' },
        pink:   { id: 'pink',   label: 'Pink',   bg: 'rgba(244, 114, 182, 0.42)', border: '#f472b6', text: '#ec4899', dot: '#f472b6' }
    };

    let activeCardEl = null;
    let currentAnnotations = [];
    let lastRightClickSelection = null;
    let currentSelectionState = null;

    // Inject styles once DOM is ready
    function injectHighlighterStyles() {
        if (document.getElementById('qbrowse-highlighter-styles')) return;
        const style = document.createElement('style');
        style.id = 'qbrowse-highlighter-styles';
        style.textContent = `
            .qbrowse-highlight {
                transition: background-color 0.2s ease, box-shadow 0.2s ease;
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
            }
            .qbrowse-highlight:hover {
                filter: brightness(1.12);
            }
            .qbrowse-highlight-pulse {
                animation: qbrowsePulseAnim 1.8s ease-in-out !important;
            }
            @keyframes qbrowsePulseAnim {
                0% { outline: 4px solid var(--qb-pulse-color, #d4bc94); box-shadow: 0 0 25px var(--qb-pulse-color, #d4bc94); }
                50% { outline: 6px solid var(--qb-pulse-color, #d4bc94); box-shadow: 0 0 35px var(--qb-pulse-color, #d4bc94); }
                100% { outline: 0px solid transparent; box-shadow: none; }
            }
            .qbrowse-note-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-left: 3px;
                vertical-align: 1px;
                cursor: pointer;
                background: rgba(12, 13, 20, 0.78);
                backdrop-filter: blur(64px);
                -webkit-backdrop-filter: blur(64px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 6px;
                padding: 1px 4px;
                font-size: 11px;
                line-height: 14px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.6);
                transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
                user-select: none;
            }
            .qbrowse-note-badge:hover {
                transform: scale(1.18);
                background: rgba(12, 13, 20, 0.95);
                border-color: #d4bc94;
            }
            html.qbrowse-smart-dark-active .qbrowse-note-badge,
            html.qbrowse-smart-dark-active #qbrowse-passkey-popup-modal,
            html.qbrowse-smart-dark-active .qvault-autofill-dropdown,
            html.qbrowse-smart-dark-active .qvault-inline-key-btn {
                filter: invert(1) hue-rotate(180deg) !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', injectHighlighterStyles);
    } else {
        injectHighlighterStyles();
    }

    function removeCard() {
        const legacyCard = document.getElementById('qbrowse-note-card');
        if (legacyCard) legacyCard.remove();
        if (activeCardEl) {
            activeCardEl.remove();
            activeCardEl = null;
        }
    }

    function extractPrefixAndSuffix(range) {
        let prefix = '';
        let suffix = '';
        try {
            const startNode = range.startContainer;
            if (startNode && startNode.nodeValue) {
                prefix = startNode.nodeValue.substring(Math.max(0, range.startOffset - 32), range.startOffset);
            }
            const endNode = range.endContainer;
            if (endNode && endNode.nodeValue) {
                suffix = endNode.nodeValue.substring(range.endOffset, Math.min(endNode.nodeValue.length, range.endOffset + 32));
            }
        } catch (_) {}
        return { prefix, suffix };
    }

    function wrapRangeWithHighlight(range, id, colorKey, noteText = '') {
        const color = QB_HIGHLIGHT_COLORS[colorKey] || QB_HIGHLIGHT_COLORS.accent;
        const marks = [];

        try {
            if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
                const textNode = range.startContainer;
                const selectedText = textNode.textContent.substring(range.startOffset, range.endOffset);
                
                const mark = document.createElement('mark');
                mark.className = 'qbrowse-highlight';
                mark.setAttribute('data-qbrowse-id', id);
                mark.setAttribute('data-color', colorKey);
                mark.style.cssText = `background-color: ${color.bg} !important; border-bottom: 2px solid ${color.border} !important; color: inherit !important; border-radius: 3px; padding: 1px 1px; cursor: pointer; text-decoration: none;`;
                mark.textContent = selectedText;

                const afterText = textNode.splitText(range.startOffset);
                afterText.deleteData(0, range.endOffset - range.startOffset);
                afterText.parentNode.insertBefore(mark, afterText);
                marks.push(mark);
            } else {
                const mark = document.createElement('mark');
                mark.className = 'qbrowse-highlight';
                mark.setAttribute('data-qbrowse-id', id);
                mark.setAttribute('data-color', colorKey);
                mark.style.cssText = `background-color: ${color.bg} !important; border-bottom: 2px solid ${color.border} !important; color: inherit !important; border-radius: 3px; padding: 1px 1px; cursor: pointer; text-decoration: none;`;
                
                const fragment = range.extractContents();
                mark.appendChild(fragment);
                range.insertNode(mark);
                marks.push(mark);
            }
        } catch (e) {
            console.warn('[QBrowse Annotations] wrapRangeWithHighlight error:', e);
        }

        if (marks.length > 0 && noteText) {
            attachNoteBadge(marks[marks.length - 1], id);
        }

        return marks;
    }

    function attachNoteBadge(targetEl, id) {
        let existing = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
        if (existing) return existing;

        const badge = document.createElement('span');
        badge.className = 'qbrowse-note-badge';
        badge.setAttribute('data-qbrowse-id', id);
        badge.title = 'Click to view note';
        badge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d4bc94" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; display: inline-block;"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>`;
        badge.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openNoteCard(id, badge);
        };

        if (targetEl.nextSibling) {
            targetEl.parentNode.insertBefore(badge, targetEl.nextSibling);
        } else {
            targetEl.parentNode.appendChild(badge);
        }
        return badge;
    }

    function findTextRangeInDocument(targetText, prefix = '', suffix = '') {
        if (!targetText || !document.body) return null;
        const cleanTarget = targetText.trim();
        if (!cleanTarget) return null;

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_SKIP;
                    const tag = parent.tagName.toUpperCase();
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'MARK'].includes(tag)) {
                        return NodeFilter.FILTER_SKIP;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let node;
        let fullText = '';
        while ((node = walker.nextNode())) {
            const start = fullText.length;
            const val = node.nodeValue;
            fullText += val;
            textNodes.push({ node, start, end: start + val.length });
        }

        let bestIndex = -1;
        let bestScore = -1;
        let searchIdx = -1;

        while ((searchIdx = fullText.indexOf(cleanTarget, searchIdx + 1)) !== -1) {
            let score = 0;
            if (prefix) {
                const actualPrefix = fullText.slice(Math.max(0, searchIdx - prefix.length), searchIdx);
                if (actualPrefix.includes(prefix) || prefix.includes(actualPrefix)) score += 2;
            }
            if (suffix) {
                const actualSuffix = fullText.slice(searchIdx + cleanTarget.length, searchIdx + cleanTarget.length + suffix.length);
                if (actualSuffix.includes(suffix) || suffix.includes(actualSuffix)) score += 2;
            }
            if (score > bestScore) {
                bestScore = score;
                bestIndex = searchIdx;
            }
            if (!prefix && !suffix) {
                bestIndex = searchIdx;
                break;
            }
        }

        let matchLength = cleanTarget.length;
        if (bestIndex === -1) {
            const lowerFull = fullText.toLowerCase();
            const lowerTarget = cleanTarget.toLowerCase();
            bestIndex = lowerFull.indexOf(lowerTarget);
        }

        // Whitespace-normalized fallback (collapses multiple spaces, newlines, tabs)
        if (bestIndex === -1) {
            const normClean = cleanTarget.replace(/\s+/g, ' ').toLowerCase();
            const normFull = fullText.replace(/\s+/g, ' ').toLowerCase();
            const normFound = normFull.indexOf(normClean);
            if (normFound !== -1) {
                // Approximate original index in raw fullText
                const leadWords = normClean.split(' ').slice(0, 3).join(' ');
                const leadIdx = fullText.toLowerCase().indexOf(leadWords);
                if (leadIdx !== -1) {
                    bestIndex = leadIdx;
                    matchLength = Math.min(cleanTarget.length, fullText.length - bestIndex);
                }
            }
        }

        if (bestIndex === -1) return null;

        const matchEnd = bestIndex + matchLength;
        let startContainer = null, startOffset = 0;
        let endContainer = null, endOffset = 0;

        for (const item of textNodes) {
            if (!startContainer && item.start <= bestIndex && bestIndex <= item.end) {
                startContainer = item.node;
                startOffset = bestIndex - item.start;
            }
            if (item.start <= matchEnd && matchEnd <= item.end) {
                endContainer = item.node;
                endOffset = matchEnd - item.start;
                break;
            }
        }

        if (startContainer && endContainer) {
            try {
                const range = document.createRange();
                range.setStart(startContainer, startOffset);
                range.setEnd(endContainer, endOffset);
                return range;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    function createHighlightFromRange(range, colorKey = 'accent', initialNote = '') {
        if (!range) return null;
        const text = range.toString().trim();
        if (!text) return null;

        // a) Check if the selection range is already inside an existing .qbrowse-highlight
        const container = range.commonAncestorContainer;
        const containerEl = container?.nodeType === 1 ? container : container?.parentElement;
        const existingMark = containerEl ? containerEl.closest('.qbrowse-highlight') : null;
        if (existingMark) {
            const existingId = existingMark.getAttribute('data-qbrowse-id');
            if (existingId) {
                let updated = false;
                const ann = currentAnnotations.find(a => a.id === existingId);

                // Update color styling if colorKey is given
                if (colorKey) {
                    const colorConfig = QB_HIGHLIGHT_COLORS[colorKey] || QB_HIGHLIGHT_COLORS.accent;
                    document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${existingId}"]`).forEach(m => {
                        m.setAttribute('data-color', colorKey);
                        m.style.backgroundColor = `${colorConfig.bg} !important`;
                        m.style.borderBottom = `2px solid ${colorConfig.border} !important`;
                    });
                    if (ann && ann.color !== colorKey) {
                        ann.color = colorKey;
                        updated = true;
                    }
                }

                if (initialNote) {
                    if (ann && ann.note !== initialNote) {
                        ann.note = initialNote;
                        updated = true;
                    }
                    attachNoteBadge(existingMark, existingId);
                }

                // Send qbrowse-annotation-update if color or note is updated
                if (updated || initialNote) {
                    ipcRenderer.sendToHost('qbrowse-annotation-update', {
                        id: existingId,
                        color: colorKey || (ann ? ann.color : 'accent'),
                        note: ann ? ann.note : (initialNote || '')
                    });
                }

                // Clear currentSelectionState and lastRightClickSelection, clear window selection
                currentSelectionState = null;
                lastRightClickSelection = null;
                if (window.getSelection) {
                    try { window.getSelection().removeAllRanges(); } catch (_) {}
                }

                return { id: existingId, marks: [existingMark] };
            }
        }

        // b) Check if currentAnnotations.some(a => (a.text || '').trim() === text)
        const existingAnnotation = currentAnnotations.find(a => (a.text || '').trim() === text);
        const id = existingAnnotation ? existingAnnotation.id : `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const marks = wrapRangeWithHighlight(range, id, colorKey, initialNote || (existingAnnotation ? existingAnnotation.note : ''));
        if (marks.length === 0) return null;

        if (existingAnnotation) {
            // Reuse its ID, clear currentSelectionState and lastRightClickSelection, and do not send qbrowse-annotation-create
            if (initialNote && existingAnnotation.note !== initialNote) {
                existingAnnotation.note = initialNote;
                ipcRenderer.sendToHost('qbrowse-annotation-update', {
                    id: existingAnnotation.id,
                    color: colorKey || existingAnnotation.color,
                    note: initialNote
                });
            }
            currentSelectionState = null;
            lastRightClickSelection = null;
            if (window.getSelection) {
                try { window.getSelection().removeAllRanges(); } catch (_) {}
            }
            return { id, marks, annotation: existingAnnotation };
        }

        // c) When creating a new highlight, always clear BOTH currentSelectionState = null; and lastRightClickSelection = null;
        const { prefix, suffix } = extractPrefixAndSuffix(range);
        const annotation = {
            id,
            url: window.location.href,
            title: document.title || window.location.href,
            text,
            prefix,
            suffix,
            color: colorKey,
            note: initialNote
        };

        currentAnnotations.push(annotation);
        ipcRenderer.sendToHost('qbrowse-annotation-create', annotation);

        currentSelectionState = null;
        lastRightClickSelection = null;

        if (window.getSelection) {
            try { window.getSelection().removeAllRanges(); } catch (_) {}
        }

        return { id, marks, annotation };
    }

    let activeAnchorId = null;
    let anchorRaf = null;
    let selectionPillVisible = false;

    function openNoteCard(id, anchorEl) {
        removeCard();
        if (selectionPillVisible) {
            selectionPillVisible = false;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
        }

        const ann = currentAnnotations.find(a => a.id === id) || { id, note: '', color: 'accent' };
        const rect = anchorEl ? anchorEl.getBoundingClientRect() : { top: 100, bottom: 120, left: 100, right: 120, width: 20, height: 20 };
        activeAnchorId = id;

        ipcRenderer.sendToHost('qbrowse-open-note-card', {
            id,
            rect: {
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height
            },
            note: ann.note || '',
            color: ann.color || 'accent',
            text: ann.text || ''
        });
    }

    window.addEventListener('scroll', () => {
        if (selectionPillVisible) {
            selectionPillVisible = false;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
        }
        if (activeAnchorId) {
            if (!anchorRaf) {
                anchorRaf = requestAnimationFrame(() => {
                    anchorRaf = null;
                    if (!activeAnchorId) return;
                    const anchor = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${activeAnchorId}"]`) || document.querySelector(`.qbrowse-highlight[data-qbrowse-id="${activeAnchorId}"]`);
                    if (anchor) {
                        const rect = anchor.getBoundingClientRect();
                        ipcRenderer.sendToHost('qbrowse-update-note-anchor', {
                            id: activeAnchorId,
                            rect: {
                                top: rect.top,
                                bottom: rect.bottom,
                                left: rect.left,
                                right: rect.right,
                                width: rect.width,
                                height: rect.height
                            }
                        });
                    }
                });
            }
        }
    }, { passive: true });

    window.addEventListener('mousedown', (e) => {
        const isBadge = e.target && e.target.closest && e.target.closest('.qbrowse-note-badge');
        if (activeAnchorId && !isBadge) {
            ipcRenderer.sendToHost('qbrowse-close-note-card');
            activeAnchorId = null;
        }
        if (!isBadge) {
            if (selectionPillVisible) {
                selectionPillVisible = false;
                ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            }
        }
    });

    ipcRenderer.on('qbrowse-annotation-update', (event, { id, note, color }) => {
        const ann = currentAnnotations.find(a => a.id === id);
        if (ann) {
            if (note !== undefined) ann.note = note;
            if (color !== undefined) ann.color = color;
        }

        if (color) {
            const colorConfig = QB_HIGHLIGHT_COLORS[color] || QB_HIGHLIGHT_COLORS.accent;
            document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`).forEach(m => {
                m.setAttribute('data-color', color);
                m.style.backgroundColor = `${colorConfig.bg} !important`;
                m.style.borderBottom = `2px solid ${colorConfig.border} !important`;
            });
        }

        if (note !== undefined) {
            const targetMarks = document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`);
            const hasNote = note && (typeof note === 'string' ? note.trim() : note);
            if (targetMarks.length > 0) {
                if (hasNote) {
                    attachNoteBadge(targetMarks[targetMarks.length - 1], id);
                } else {
                    const existingBadge = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
                    if (existingBadge) existingBadge.remove();
                }
            } else {
                if (!hasNote) {
                    const existingBadge = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
                    if (existingBadge) existingBadge.remove();
                }
            }
        }
    });

    ipcRenderer.on('qbrowse-annotation-delete', (event, id) => {
        document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`).forEach(m => {
            const parent = m.parentNode;
            if (parent) {
                while (m.firstChild) parent.insertBefore(m.firstChild, m);
                m.remove();
            }
        });
        const badge = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
        if (badge) badge.remove();

        currentAnnotations = currentAnnotations.filter(a => a.id !== id);
        if (activeAnchorId === id) {
            ipcRenderer.sendToHost('qbrowse-close-note-card');
            activeAnchorId = null;
        }
    });

    ipcRenderer.on('qbrowse-close-note-card', () => {
        activeAnchorId = null;
    });

    function handleSelectionCheck() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            currentSelectionState = null;
            if (selectionPillVisible) {
                selectionPillVisible = false;
                ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            }
            return;
        }

        const text = sel.toString().trim();
        if (text.length < 2) {
            currentSelectionState = null;
            if (selectionPillVisible) {
                selectionPillVisible = false;
                ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            }
            return;
        }

        const anchor = sel.anchorNode;
        const focus = sel.focusNode;
        const anchorEl = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
        const focusEl = focus?.nodeType === 1 ? focus : focus?.parentElement;
        if (anchorEl?.closest('input, textarea, [contenteditable="true"]') ||
            focusEl?.closest('input, textarea, [contenteditable="true"]')) {
            currentSelectionState = null;
            if (selectionPillVisible) {
                selectionPillVisible = false;
                ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            }
            return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            currentSelectionState = null;
            if (selectionPillVisible) {
                selectionPillVisible = false;
                ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            }
            return;
        }

        const { prefix, suffix } = extractPrefixAndSuffix(range);
        currentSelectionState = {
            range: range.cloneRange(),
            text,
            prefix,
            suffix
        };
        lastRightClickSelection = currentSelectionState;

        selectionPillVisible = true;
        ipcRenderer.sendToHost('qbrowse-show-selection-pill', {
            rect: {
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height
            },
            text
        });
    }

    window.addEventListener('mousedown', (e) => {
        // Send page clicked to dismiss any context menus, popovers, or active popups on host
        ipcRenderer.sendToHost('webview-page-clicked');

        // If not right-click, hide selection pill immediately on mouse press
        if (e.button !== 2) {
            if (selectionPillVisible) {
                selectionPillVisible = false;
                ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            }
        }
    }, true);

    document.addEventListener('selectionchange', () => {
        // Fast-path: do not inspect or stringify selection during normal typing unless selection pill is active
        if (!selectionPillVisible) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            selectionPillVisible = false;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
        }
    });

    window.addEventListener('scroll', () => {
        if (selectionPillVisible) {
            selectionPillVisible = false;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
        }
    }, { passive: true });

    window.addEventListener('mouseup', () => {
        if (activeCardEl) return;
        setTimeout(handleSelectionCheck, 20);
    });

    window.addEventListener('keyup', (e) => {
        if (['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            setTimeout(handleSelectionCheck, 20);
        }
    });

    // Right-click context menu tracking for annotations
    window.addEventListener('contextmenu', (e) => {
        if (selectionPillVisible) {
            selectionPillVisible = false;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
        }
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length >= 1) {
            try {
                const range = sel.getRangeAt(0);
                if (range && (range.intersectsNode ? range.intersectsNode(e.target) : true)) {
                    const text = sel.toString().trim();
                    const { prefix, suffix } = extractPrefixAndSuffix(range);
                    lastRightClickSelection = {
                        range: range.cloneRange(),
                        text,
                        prefix,
                        suffix
                    };
                    return;
                }
            } catch (_) {}
        }
        lastRightClickSelection = null;
    });

    // IPC: Create highlight triggered from host floating pill
    ipcRenderer.on('qbrowse-pill-create-highlight', (event, { color = 'accent' } = {}) => {
        selectionPillVisible = false;
        const targetRange = currentSelectionState?.range || lastRightClickSelection?.range || (window.getSelection()?.rangeCount > 0 ? window.getSelection().getRangeAt(0) : null);
        if (targetRange) {
            createHighlightFromRange(targetRange, color);
            try { window.getSelection().removeAllRanges(); } catch (_) {}
        }
        currentSelectionState = null;
        lastRightClickSelection = null;
    });

    // IPC: Add note triggered from host floating pill
    ipcRenderer.on('qbrowse-pill-add-note', () => {
        selectionPillVisible = false;
        const targetRange = currentSelectionState?.range || lastRightClickSelection?.range || (window.getSelection()?.rangeCount > 0 ? window.getSelection().getRangeAt(0) : null);
        let res = null;
        if (targetRange) {
            res = createHighlightFromRange(targetRange, 'accent');
            try { window.getSelection().removeAllRanges(); } catch (_) {}
        }
        currentSelectionState = null;
        lastRightClickSelection = null;
        if (res && res.marks && res.marks.length > 0) {
            openNoteCard(res.id, res.marks[res.marks.length - 1]);
        }
    });

    // Global click listener for existing highlights
    document.addEventListener('click', (e) => {
        const mark = e.target.closest('.qbrowse-highlight');
        if (mark) {
            const id = mark.getAttribute('data-qbrowse-id');
            if (id) {
                e.preventDefault();
                e.stopPropagation();
                openNoteCard(id, mark);
            }
        }
    }, true);

    // IPC: Apply annotations from host
    ipcRenderer.on('qbrowse-apply-annotations', (event, annotations) => {
        if (!Array.isArray(annotations)) return;
        const newIdSet = new Set(annotations.map(a => a.id));

        // 1. Remove highlights from DOM that are no longer in annotations
        document.querySelectorAll('.qbrowse-highlight').forEach(m => {
            const id = m.getAttribute('data-qbrowse-id');
            if (id && !newIdSet.has(id)) {
                const parent = m.parentNode;
                if (parent) {
                    while (m.firstChild) parent.insertBefore(m.firstChild, m);
                    m.remove();
                }
            }
        });

        // 2. Remove note badges from DOM that are no longer in annotations
        document.querySelectorAll('.qbrowse-note-badge').forEach(badge => {
            const id = badge.getAttribute('data-qbrowse-id');
            if (id && !newIdSet.has(id)) {
                badge.remove();
            }
        });

        // 3. Close open note card modal if its annotation was deleted
        if (activeAnchorId && !newIdSet.has(activeAnchorId)) {
            ipcRenderer.sendToHost('qbrowse-close-note-card');
            activeAnchorId = null;
        }

        currentAnnotations = annotations;

        annotations.forEach(ann => {
            // If already rendered in DOM, update color & note badge
            const existingMarks = document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${ann.id}"]`);
            if (existingMarks.length > 0) {
                const colorConfig = QB_HIGHLIGHT_COLORS[ann.color] || QB_HIGHLIGHT_COLORS.accent;
                existingMarks.forEach(m => {
                    m.style.backgroundColor = colorConfig.bg;
                    m.style.borderBottomColor = colorConfig.border;
                });
                if (ann.note && (typeof ann.note === 'string' ? ann.note.trim() : ann.note)) {
                    attachNoteBadge(existingMarks[existingMarks.length - 1], ann.id);
                } else {
                    const badge = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${ann.id}"]`);
                    if (badge) badge.remove();
                }
                return;
            }

            // Not yet rendered: locate range and render
            const range = findTextRangeInDocument(ann.text, ann.prefix, ann.suffix);
            if (range) {
                wrapRangeWithHighlight(range, ann.id, ann.color || 'accent', ann.note || '');
            }
        });
    });

    // IPC: Scroll to annotation and pulse it
    ipcRenderer.on('qbrowse-scroll-to-annotation', (event, data) => {
        const id = typeof data === 'string' ? data : (data?.id || '');
        if (!id) return;
        
        const directAnn = (typeof data === 'object' && data?.annotation) ? data.annotation : null;
        if (directAnn && !currentAnnotations.some(a => a.id === id)) {
            currentAnnotations.push(directAnn);
        }

        function attemptScrollAndReveal() {
            let marks = document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`);
            if (marks.length === 0) {
                // If not yet wrapped in DOM, wrap immediately from direct payload or currentAnnotations
                const targetAnn = directAnn || currentAnnotations.find(a => a.id === id);
                if (targetAnn && targetAnn.text) {
                    const range = findTextRangeInDocument(targetAnn.text, targetAnn.prefix, targetAnn.suffix);
                    if (range) {
                        wrapRangeWithHighlight(range, targetAnn.id, targetAnn.color || 'accent', targetAnn.note || '');
                        marks = document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`);
                    }
                }
            }

            if (marks.length > 0) {
                const firstMark = marks[0];
                const lastMark = marks[marks.length - 1];

                // 1. Smooth element scroll
                try {
                    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                } catch (_) {
                    firstMark.scrollIntoView();
                }

                // 2. Ensure parent scrollable containers or window adjust correctly
                setTimeout(() => {
                    try {
                        const rect = firstMark.getBoundingClientRect();
                        if (rect.top < 60 || rect.bottom > (window.innerHeight - 60)) {
                            const targetY = window.pageYOffset + rect.top - (window.innerHeight / 2);
                            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
                        }

                        // Scroll internal overflow container if applicable
                        let parent = firstMark.parentElement;
                        while (parent && parent !== document.body && parent !== document.documentElement) {
                            const style = window.getComputedStyle(parent);
                            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                                const pRect = parent.getBoundingClientRect();
                                const mRect = firstMark.getBoundingClientRect();
                                const pOffset = mRect.top - pRect.top - (parent.clientHeight / 2);
                                parent.scrollBy({ top: pOffset, behavior: 'smooth' });
                                break;
                            }
                            parent = parent.parentElement;
                        }
                    } catch (_) {}
                }, 100);

                // 3. Bright pulse animation
                marks.forEach(m => {
                    m.classList.remove('qbrowse-highlight-pulse');
                    void m.offsetWidth; // Force reflow
                    m.classList.add('qbrowse-highlight-pulse');
                });
                setTimeout(() => {
                    marks.forEach(m => m.classList.remove('qbrowse-highlight-pulse'));
                }, 2800);

                // 4. Reveal Note Card or Pill
                const annObj = directAnn || currentAnnotations.find(a => a.id === id);
                if (annObj && annObj.note) {
                    setTimeout(() => {
                        openNoteCard(id, lastMark);
                    }, 350);
                }
                return true;
            }
            return false;
        }

        if (!attemptScrollAndReveal()) {
            let retries = 0;
            const maxRetries = 15;
            const interval = setInterval(() => {
                retries++;
                if (attemptScrollAndReveal() || retries >= maxRetries) {
                    clearInterval(interval);
                }
            }, 150);
        }
    });

    // IPC: Context menu actions
    ipcRenderer.on('qbrowse-context-highlight', (event, { color = 'accent' } = {}) => {
        if (lastRightClickSelection && lastRightClickSelection.range) {
            createHighlightFromRange(lastRightClickSelection.range, color);
        }
        currentSelectionState = null;
        lastRightClickSelection = null;
    });

    ipcRenderer.on('qbrowse-context-add-note', () => {
        let res = null;
        if (lastRightClickSelection && lastRightClickSelection.range) {
            res = createHighlightFromRange(lastRightClickSelection.range, 'accent');
        }
        currentSelectionState = null;
        lastRightClickSelection = null;
        if (res && res.marks && res.marks.length > 0) {
            openNoteCard(res.id, res.marks[res.marks.length - 1]);
        }
    });
})();

// ============================================================================
// --- QVAULT INLINE AUTOFILL & CREDENTIAL SUBMISSION ENGINE ---
// ============================================================================
(function initQVaultEngine() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let qvaultMatches = [];
    const activeBadgeMap = new Map(); // input element -> badge DOM element
    let activeDropdownEl = null;
    let lastSubmissionTime = 0;

    function setNativeInputValue(el, val) {
        if (!el) return;
        try {
            const previousValue = el.value;
            try { el.focus(); } catch (_) {}

            const proto = window.HTMLInputElement ? window.HTMLInputElement.prototype : Object.getPrototypeOf(el);
            const descriptor = Object.getOwnPropertyDescriptor(proto, 'value') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
            if (descriptor && descriptor.set) {
                descriptor.set.call(el, val);
            } else {
                el.value = val;
            }

            // Update React 16-19 internal _valueTracker so controlled inputs register the change
            if (el._valueTracker && typeof el._valueTracker.setValue === 'function') {
                try { el._valueTracker.setValue(previousValue); } catch (_) {}
            }

            try {
                el.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertReplacementText',
                    data: val
                }));
            } catch (_) {
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            el.dispatchEvent(new Event('change', { bubbles: true }));
            try {
                el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Unidentified' }));
            } catch (_) {}
        } catch (_) {
            el.value = val;
        }
    }

    function flashAutofillHighlight(el) {
        if (!el) return;
        const prevTransition = el.style.transition;
        const prevShadow = el.style.boxShadow;
        el.style.transition = 'box-shadow 0.25s ease';
        el.style.boxShadow = '0 0 0 2px rgba(212, 188, 148, 0.7), 0 0 12px rgba(212, 188, 148, 0.4)';
        setTimeout(() => {
            el.style.boxShadow = prevShadow;
            setTimeout(() => { el.style.transition = prevTransition; }, 300);
        }, 800);
    }

    function isLikelyUsernameInput(inp) {
        if (!inp || inp.tagName !== 'INPUT') return false;
        if (inp.disabled || inp.readOnly) return false;
        const type = (inp.getAttribute('type') || inp.type || 'text').toLowerCase();
        if (['hidden', 'password', 'submit', 'button', 'checkbox', 'radio', 'file', 'image', 'reset', 'range', 'color', 'date', 'number', 'search'].includes(type)) {
            return false;
        }
        const auto = (inp.getAttribute('autocomplete') || '').toLowerCase();
        const name = (inp.name || '').toLowerCase();
        const id = (inp.id || '').toLowerCase();
        const placeholder = (inp.getAttribute('placeholder') || '').toLowerCase();
        const ariaLabel = (inp.getAttribute('aria-label') || '').toLowerCase();
        const combined = `${auto} ${name} ${id} ${placeholder} ${ariaLabel}`;

        if (/search|query|filter|coupon|promo|zip|postal|otp|totp|verification|code|pin|cvv|cvc|card/i.test(combined)) {
            return false;
        }
        if (type === 'email') return true;
        if (auto.includes('username') || auto.includes('email')) return true;
        return /user|login|email|e-mail|account|identifier|handle|phone|mobile|member/i.test(combined);
    }

    function isElementVisiblyRendered(el) {
        if (!el) return false;
        try {
            const rect = el.getBoundingClientRect();
            if (rect.width <= 20 || rect.height <= 15) return false;
            const st = window.getComputedStyle(el);
            return st.visibility !== 'hidden' && st.display !== 'none' && parseFloat(st.opacity || '1') > 0.05;
        } catch (_) {
            return false;
        }
    }

    function findAssociatedFields(targetField) {
        let passwordField = null;
        let usernameField = null;

        const form = targetField ? (targetField.form || (targetField.closest ? targetField.closest('form') : null)) : null;
        if (form) {
            const formPasswords = Array.from(form.querySelectorAll('input[type="password"]'));
            passwordField = formPasswords.find(isElementVisiblyRendered) || formPasswords[0] || null;

            const candidates = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])'))
                .filter(c => !c.disabled && !c.readOnly);
            usernameField = candidates.find(c => isLikelyUsernameInput(c) && isElementVisiblyRendered(c)) ||
                            candidates.find(isLikelyUsernameInput) ||
                            candidates.find(isElementVisiblyRendered) ||
                            candidates[0] || null;
        } else if (targetField) {
            if (targetField.type === 'password') {
                passwordField = targetField;
                const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])'));
                const passIdx = allInputs.indexOf(targetField);
                for (let i = passIdx - 1; i >= 0; i--) {
                    const inp = allInputs[i];
                    if (inp.type !== 'password' && !inp.disabled && !inp.readOnly && isElementVisiblyRendered(inp)) {
                        usernameField = inp;
                        break;
                    }
                }
            } else {
                usernameField = targetField;
                const allPasswords = Array.from(document.querySelectorAll('input[type="password"]'));
                passwordField = allPasswords.find(isElementVisiblyRendered) || null;
            }
        }

        return { passwordField, usernameField };
    }

    async function fillAccountCredentials(cred, sourceInput) {
        if (!cred) return;

        if (cred.locked || !cred.password) {
            closeAutofillDropdown();
            const verifyRes = await ipcRenderer.invoke('vault-verify-passkey-usage', {
                hostname: window.location.hostname,
                rpId: window.location.hostname,
                username: cred.username || cred.title || 'Saved Login',
                credentialId: String(cred.id || ''),
                mode: 'autofill'
            });
            if (!verifyRes || !verifyRes.verified) return;

            const freshMatches = await ipcRenderer.invoke('vault-get-matching', window.location.hostname);
            const unlockedLogins = (freshMatches || []).filter(m => m.itemType !== 'passkey' && !m.passkeyData && m.password);
            qvaultMatches = unlockedLogins;
            const unlockedCred = unlockedLogins.find(m => (cred.id && String(m.id) === String(cred.id)) || (cred.username && m.username === cred.username)) || unlockedLogins[0];
            if (!unlockedCred) return;
            cred = unlockedCred;
        }

        const { passwordField, usernameField } = findAssociatedFields(sourceInput);

        if (usernameField && cred.username) {
            setNativeInputValue(usernameField, cred.username);
            flashAutofillHighlight(usernameField);
        }
        if (passwordField && cred.password) {
            setNativeInputValue(passwordField, cred.password);
            flashAutofillHighlight(passwordField);
        }
        closeAutofillDropdown();
    }

    function closeAutofillDropdown() {
        if (activeDropdownEl) {
            activeDropdownEl.remove();
            activeDropdownEl = null;
        }
    }

    function ensureQVaultStyles() {
        if (document.getElementById('qvault-autofill-isolation-styles')) return;
        const style = document.createElement('style');
        style.id = 'qvault-autofill-isolation-styles';
        style.textContent = `
            .qvault-autofill-dropdown,
            .qvault-autofill-dropdown *,
            .qvault-inline-key-btn,
            .qvault-inline-key-btn * {
                box-sizing: border-box !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                text-transform: none !important;
                letter-spacing: normal !important;
                text-shadow: none !important;
                -webkit-font-smoothing: antialiased !important;
            }
            .qvault-autofill-dropdown {
                background: rgba(18, 20, 32, 0.62) !important;
                backdrop-filter: blur(32px) saturate(190%) brightness(0.75) !important;
                -webkit-backdrop-filter: blur(32px) saturate(190%) brightness(0.75) !important;
                border: 1px solid rgba(255, 255, 255, 0.10) !important;
                border-radius: 16px !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.14) !important;
                padding: 6px !important;
                color: rgba(255, 255, 255, 0.95) !important;
                color-scheme: dark !important;
            }
            .qvault-autofill-dropdown .qvault-dropdown-header,
            .qvault-autofill-dropdown .qvault-dropdown-header span,
            .qvault-autofill-dropdown .qvault-dropdown-header svg {
                color: #d4bc94 !important;
            }
            .qvault-autofill-dropdown .qvault-dropdown-user {
                color: rgba(255, 255, 255, 0.95) !important;
                font-weight: 500 !important;
                font-size: 12px !important;
                line-height: 1.35 !important;
            }
            .qvault-autofill-dropdown .qvault-dropdown-sub {
                color: #d4bc94 !important;
                font-size: 10px !important;
                line-height: 1.3 !important;
            }
            .qvault-inline-key-btn {
                color: #d4bc94 !important;
                color-scheme: dark !important;
            }
            .qvault-inline-key-btn svg {
                color: #d4bc94 !important;
                stroke: currentColor !important;
                fill: none !important;
            }
            html.qbrowse-smart-dark-active .qvault-autofill-dropdown,
            html.qbrowse-smart-dark-active .qvault-inline-key-btn {
                filter: invert(1) hue-rotate(180deg) !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function showAutofillDropdown(btnEl, targetInput, matches) {
        closeAutofillDropdown();
        if (!matches || matches.length === 0) return;
        ensureQVaultStyles();

        const rect = targetInput.getBoundingClientRect();
        const dropdown = document.createElement('div');
        dropdown.className = 'qvault-autofill-dropdown';
        dropdown.style.position = 'fixed';
        dropdown.style.zIndex = '2147483647';
        dropdown.style.top = `${Math.min(window.innerHeight - 200, rect.bottom + 6)}px`;
        
        const dropdownWidth = 240;
        const idealLeft = rect.right - dropdownWidth;
        dropdown.style.left = `${Math.max(12, Math.min(idealLeft, window.innerWidth - dropdownWidth - 12))}px`;
        dropdown.style.width = `${dropdownWidth}px`;
        dropdown.style.background = 'rgba(18, 20, 32, 0.62)';
        dropdown.style.backdropFilter = 'blur(32px) saturate(190%) brightness(0.75)';
        dropdown.style.webkitBackdropFilter = 'blur(32px) saturate(190%) brightness(0.75)';
        dropdown.style.border = '1px solid rgba(255, 255, 255, 0.10)';
        dropdown.style.borderRadius = '16px';
        dropdown.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.14)';
        dropdown.style.padding = '6px';
        dropdown.style.color = 'rgba(255, 255, 255, 0.95)';
        dropdown.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        dropdown.style.fontSize = '12px';
        dropdown.style.textAlign = 'left';
        dropdown.style.userSelect = 'none';

        // Header
        const header = document.createElement('div');
        header.className = 'qvault-dropdown-header';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '6px';
        header.style.padding = '6px 10px 6px';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
        header.style.marginBottom = '4px';
        header.style.color = '#d4bc94';
        header.style.fontWeight = '600';
        header.style.fontSize = '11px';
        header.style.letterSpacing = '0.02em';
        header.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: #d4bc94 !important;">
                <circle cx="7.5" cy="15.5" r="5.5"></circle>
                <path d="m21 2-9.6 9.6"></path>
                <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
            </svg>
            <span style="color: #d4bc94 !important; font-weight: 600 !important;">QVault Suggestions (${matches.length})</span>
        `;
        dropdown.appendChild(header);

        // Account Items
        matches.forEach(item => {
            const row = document.createElement('div');
            row.className = 'qvault-dropdown-row';
            row.style.padding = '8px 10px';
            row.style.borderRadius = '12px';
            row.style.cursor = 'pointer';
            row.style.transition = 'background-color 0.15s ease';
            row.style.display = 'flex';
            row.style.flexDirection = 'column';
            row.style.gap = '2px';
            row.style.backgroundColor = 'transparent';

            const userText = item.username || item.title || 'Saved Account';
            const secondLine = (item.locked || !item.password)
                ? `<div class="qvault-dropdown-sub" style="font-size: 10px; color: #d4bc94 !important; display: flex; align-items: center; gap: 4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Locked - Click to verify & autofill</div>`
                : `<div class="qvault-dropdown-sub" style="font-size: 10px; font-family: monospace !important; color: #d4bc94 !important; letter-spacing: 0.1em !important;">••••••••</div>`;
            row.innerHTML = `
                <div class="qvault-dropdown-user" style="font-weight: 500; color: rgba(255, 255, 255, 0.95) !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(userText)}</div>
                ${secondLine}
            `;

            row.onmouseenter = () => { row.style.backgroundColor = 'rgba(255, 255, 255, 0.10)'; };
            row.onmouseleave = () => { row.style.backgroundColor = 'transparent'; };
            row.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                fillAccountCredentials(item, targetInput);
            };

            dropdown.appendChild(row);
        });

        document.body.appendChild(dropdown);
        activeDropdownEl = dropdown;

        const onOutsideClick = (e) => {
            if (activeDropdownEl && !activeDropdownEl.contains(e.target) && !btnEl.contains(e.target)) {
                closeAutofillDropdown();
                document.removeEventListener('mousedown', onOutsideClick);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 10);
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }

    function createKeyBadge(inputEl) {
        ensureQVaultStyles();
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.tabIndex = -1;
        btn.className = 'qvault-inline-key-btn';
        btn.title = qvaultMatches.some(m => m.locked) ? 'Unlock & Autofill with QVault' : 'Autofill with QVault';
        btn.style.position = 'fixed';
        btn.style.zIndex = '2147483640';
        btn.style.width = '22px';
        btn.style.height = '22px';
        btn.style.borderRadius = '6px';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.12)';
        btn.style.background = 'rgba(18, 19, 26, 0.88)';
        btn.style.backdropFilter = 'blur(12px)';
        btn.style.webkitBackdropFilter = 'blur(12px)';
        btn.style.color = '#d4bc94';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.cursor = 'pointer';
        btn.style.padding = '0';
        btn.style.margin = '0';
        btn.style.outline = 'none';
        btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.35)';
        btn.style.transition = 'transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease';

        btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <circle cx="7.5" cy="15.5" r="5.5"></circle>
                <path d="m21 2-9.6 9.6"></path>
                <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
            </svg>
        `;

        btn.onmouseenter = () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.background = 'rgba(24, 26, 36, 0.96)';
            btn.style.borderColor = 'rgba(212, 188, 148, 0.65)';
            btn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.45)';
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'scale(1)';
            btn.style.background = 'rgba(18, 19, 26, 0.88)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.35)';
        };
        btn.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (qvaultMatches.length === 1) {
                fillAccountCredentials(qvaultMatches[0], inputEl);
            } else if (qvaultMatches.length > 1) {
                if (activeDropdownEl) {
                    closeAutofillDropdown();
                } else {
                    showAutofillDropdown(btn, inputEl, qvaultMatches);
                }
            }
        };

        document.body.appendChild(btn);
        return btn;
    }

    function discoverCandidateLoginInputs() {
        const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
        const relevantInputs = new Set(passwordInputs);

        // Add associated username inputs for every password field
        passwordInputs.forEach(pass => {
            const { usernameField } = findAssociatedFields(pass);
            if (usernameField) relevantInputs.add(usernameField);
        });

        // Also support 2-step login pages (Google, Microsoft, GitHub, Clerk, etc.) where Step 1 only has an email/username input
        const allTextInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])'));
        allTextInputs.forEach(inp => {
            if (isLikelyUsernameInput(inp)) {
                relevantInputs.add(inp);
            }
        });

        return relevantInputs;
    }

    function updateBadgePositions() {
        if (qvaultMatches.length === 0) {
            cleanUpBadges();
            return;
        }

        const relevantInputs = discoverCandidateLoginInputs();

        // Remove badges for elements no longer in document
        for (const [inputEl, badge] of activeBadgeMap.entries()) {
            if (!document.body.contains(inputEl) || !relevantInputs.has(inputEl)) {
                badge.remove();
                activeBadgeMap.delete(inputEl);
            }
        }

        // Add or reposition badges
        relevantInputs.forEach(input => {
            const rect = input.getBoundingClientRect();
            const isVisible = rect.width > 20 && rect.height > 15 &&
                              rect.bottom > 0 && rect.top < window.innerHeight &&
                              rect.right > 0 && rect.left < window.innerWidth &&
                              window.getComputedStyle(input).visibility !== 'hidden' &&
                              window.getComputedStyle(input).display !== 'none';

            let badge = activeBadgeMap.get(input);
            if (!isVisible) {
                if (badge) badge.style.display = 'none';
                return;
            }

            if (!badge) {
                badge = createKeyBadge(input);
                activeBadgeMap.set(input, badge);
            }

            badge.title = qvaultMatches.some(m => m.locked) ? 'Unlock & Autofill with QVault' : 'Autofill with QVault';
            badge.style.display = 'flex';
            const top = rect.top + (rect.height - 22) / 2;
            const left = rect.right - 22 - 6;
            badge.style.top = `${top}px`;
            badge.style.left = `${left}px`;
        });
    }

    function cleanUpBadges() {
        for (const badge of activeBadgeMap.values()) {
            badge.remove();
        }
        activeBadgeMap.clear();
        closeAutofillDropdown();
    }

    // --- CREDENTIAL SUBMISSION DETECTION ---
    function captureAndSubmitCredentials(formOrInput) {
        const now = Date.now();
        if (now - lastSubmissionTime < 1500) return;

        let passwordField = null;
        let usernameField = null;

        if (formOrInput) {
            const fields = findAssociatedFields(formOrInput);
            passwordField = fields.passwordField;
            usernameField = fields.usernameField;
        }

        if (!passwordField) {
            const allPass = Array.from(document.querySelectorAll('input[type="password"]'));
            passwordField = allPass.find(p => (p.value || '').trim().length > 0) || allPass[0];
            if (passwordField) {
                usernameField = findAssociatedFields(passwordField).usernameField;
            }
        }

        // Support 2-step login flows: cache Step 1 username in sessionStorage if password isn't visible yet
        const enteredUsername = (usernameField?.value || '').trim();
        if (!passwordField && enteredUsername) {
            try { sessionStorage.setItem('__qvault_step1_username', enteredUsername); } catch (_) {}
            return;
        }

        const password = (passwordField?.value || '').trim();
        if (!password) return; // Must have entered a password to prompt save

        let username = enteredUsername;
        if (!username) {
            try { username = (sessionStorage.getItem('__qvault_step1_username') || '').trim(); } catch (_) {}
        }
        lastSubmissionTime = now;

        const payload = {
            url: window.location.href,
            domain: window.location.hostname,
            username,
            password
        };

        console.log('[QVault webview_preload] Captured credential submission:', payload.domain, payload.username ? `(${payload.username})` : '(no username)');
        ipcRenderer.sendToHost('qvault-credentials-submitted', payload);
    }

    // 1. Form submit listener
    document.addEventListener('submit', (e) => {
        captureAndSubmitCredentials(e.target);
    }, true);

    // 2. Enter keydown on password or username fields
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const target = e.target;
            if (target && target.tagName === 'INPUT' && (target.type === 'password' || isLikelyUsernameInput(target))) {
                setTimeout(() => captureAndSubmitCredentials(target), 50);
            }
        }
    }, true);

    // 3. Submit button clicks (excluding forgot/reset password links)
    document.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('button, input[type="submit"], [role="button"], a') : null;
        if (!btn) return;
        if (btn.classList && (btn.classList.contains('qvault-inline-key-btn') || btn.closest('.qvault-autofill-dropdown'))) return;

        const type = (btn.getAttribute('type') || '').toLowerCase();
        const text = (btn.innerText || btn.value || '').toLowerCase();
        if (text.includes('forgot') || text.includes('reset') || text.includes('trouble') || text.includes('help')) {
            return;
        }

        const isSubmitType = type === 'submit';
        const isLoginText = text.includes('log in') || text.includes('login') ||
                            text.includes('sign in') || text.includes('signin') ||
                            text.includes('submit') || text.includes('continue') || text.includes('next');

        if (isSubmitType || isLoginText) {
            setTimeout(() => captureAndSubmitCredentials(btn), 50);
        }
    }, true);

    let isQVaultObserving = false;

    function hasLoginCandidateField() {
        if (typeof document === 'undefined') return false;
        if (document.querySelector('input[type="password"], input[type="email"], input[autocomplete*="username"], input[autocomplete*="email"]')) {
            return true;
        }
        return false;
    }

    function shouldObserveQVault() {
        return (Array.isArray(qvaultMatches) && qvaultMatches.length > 0) || hasLoginCandidateField();
    }

    let badgeUpdateRaf = null;
    let badgeUpdateTimer = null;

    function scheduleBadgePositionsUpdate(delay = 100) {
        if (qvaultMatches.length === 0) {
            cleanUpBadges();
            return;
        }
        if (badgeUpdateTimer) clearTimeout(badgeUpdateTimer);
        badgeUpdateTimer = setTimeout(() => {
            badgeUpdateTimer = null;
            if (badgeUpdateRaf) cancelAnimationFrame(badgeUpdateRaf);
            badgeUpdateRaf = requestAnimationFrame(() => {
                badgeUpdateRaf = null;
                updateBadgePositions();
            });
        }, delay);
    }

    const handleScrollOrResize = () => {
        if (qvaultMatches.length === 0 || activeBadgeMap.size === 0) return;
        if (badgeUpdateRaf) return;
        badgeUpdateRaf = requestAnimationFrame(() => {
            badgeUpdateRaf = null;
            updateBadgePositions();
        });
    };

    let hasLoadedCredentials = false;
    let mutationDebounceTimer = null;

    function isQVaultInternalNode(node) {
        if (!node || node.nodeType !== 1) return false;
        if (node.id === 'qvault-autofill-isolation-styles') return true;
        if (node.classList && (node.classList.contains('qvault-inline-key-btn') || node.classList.contains('qvault-autofill-dropdown'))) {
            return true;
        }
        return Boolean(node.closest && node.closest('.qvault-autofill-dropdown, .qvault-inline-key-btn'));
    }

    // Mutation observer to detect newly rendered login inputs (debounced & ignoring QVault's own badge DOM nodes)
    const observer = new MutationObserver((mutations) => {
        let hasExternalElementChange = false;
        for (let i = 0; i < mutations.length; i++) {
            const m = mutations[i];
            for (let j = 0; j < m.addedNodes.length; j++) {
                const n = m.addedNodes[j];
                if (n.nodeType === 1 && !isQVaultInternalNode(n)) {
                    hasExternalElementChange = true;
                    break;
                }
            }
            if (hasExternalElementChange) break;
            for (let j = 0; j < m.removedNodes.length; j++) {
                const n = m.removedNodes[j];
                if (n.nodeType === 1 && !isQVaultInternalNode(n)) {
                    hasExternalElementChange = true;
                    break;
                }
            }
            if (hasExternalElementChange) break;
        }
        if (!hasExternalElementChange) return;

        if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
        mutationDebounceTimer = setTimeout(() => {
            mutationDebounceTimer = null;
            syncQVaultObservers();
            if (qvaultMatches.length > 0) {
                scheduleBadgePositionsUpdate(50);
            }
        }, 150);
    });

    function syncQVaultObservers() {
        const shouldObserve = shouldObserveQVault();
        if (shouldObserve && !isQVaultObserving) {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
                window.addEventListener('resize', handleScrollOrResize, { passive: true });
                isQVaultObserving = true;
            } else if (typeof document !== 'undefined') {
                document.addEventListener('DOMContentLoaded', () => syncQVaultObservers(), { once: true });
            }
        } else if (!shouldObserve && isQVaultObserving) {
            observer.disconnect();
            window.removeEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
            window.removeEventListener('resize', handleScrollOrResize, { passive: true });
            isQVaultObserving = false;
            cleanUpBadges();
        }
    }

    // Listen for matching credentials from host
    ipcRenderer.on('qvault-matching-credentials', (event, matches) => {
        qvaultMatches = Array.isArray(matches) ? matches : [];
        syncQVaultObservers();
        scheduleBadgePositionsUpdate(30);
    });

    // Self-query matching credentials from main on page load & focus
    async function refreshMatchingCredentialsFromMain() {
        if (!window.location.hostname || window.location.protocol === 'about:') return;
        try {
            const res = await ipcRenderer.invoke('vault-get-matching', window.location.hostname);
            const loginMatches = (res || []).filter(m => m.itemType !== 'passkey' && !m.passkeyData);
            qvaultMatches = loginMatches;
            syncQVaultObservers();
            if (loginMatches.length > 0) {
                scheduleBadgePositionsUpdate(30);
            } else {
                cleanUpBadges();
            }
        } catch (e) {
            console.warn('[QVault] refreshMatchingCredentialsFromMain error:', e);
        }
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        syncQVaultObservers();
        refreshMatchingCredentialsFromMain();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            syncQVaultObservers();
            refreshMatchingCredentialsFromMain();
        });
    }
    window.addEventListener('load', () => {
        syncQVaultObservers();
        refreshMatchingCredentialsFromMain();
    });

    document.addEventListener('focusin', (e) => {
        const target = e.target;
        if (!target || target.tagName !== 'INPUT') return;

        const isCredentialCandidate = target.type === 'password' || isLikelyUsernameInput(target);

        if (isCredentialCandidate) {
            syncQVaultObservers();
            if (!hasLoadedCredentials || qvaultMatches.length === 0) {
                hasLoadedCredentials = true;
                refreshMatchingCredentialsFromMain();
            } else {
                scheduleBadgePositionsUpdate(20);
            }
        }
    }, true);
})();

// ==========================================
// 1. Frameless OAuth / Auth Popup Header & Controls
// ==========================================
(function() {
    function getIsOAuth() {
        try {
            if (isOAuthPopup) return true;
            if (Array.isArray(process.argv) && process.argv.includes('--is-oauth-popup')) return true;
            if (typeof window !== 'undefined' && Boolean(window.opener)) return true;
            if (typeof window !== 'undefined' && window.location && isGoogleAuthTarget(window.location.href)) {
                if (typeof ipcRenderer.sendToHost !== 'function' || !origSendToHost) return true;
            }
        } catch (_) {}
        return false;
    }

    let isOAuth = getIsOAuth();

    ipcRenderer.on('init-oauth-popup-mode', () => {
        isOAuth = true;
        isOAuthPopup = true;
        if (typeof injectOAuthControls === 'function') {
            injectOAuthControls();
        }
    });

    if (typeof window !== 'undefined') {
        try {
            window.__qbrowse_inject_oauth_controls = () => {
                isOAuth = true;
                isOAuthPopup = true;
                injectOAuthControls();
            };
        } catch (_) {}
    }

    function createSvgIcon(name, size = 12) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2.2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        if (name === 'lock') {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '3'); rect.setAttribute('y', '11'); rect.setAttribute('width', '18'); rect.setAttribute('height', '11'); rect.setAttribute('rx', '2'); rect.setAttribute('ry', '2');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M7 11V7a5 5 0 0 1 10 0v4');
            svg.appendChild(rect); svg.appendChild(path);
        } else if (name === 'arrow-left' || name === 'chevron-left') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'm15 18-6-6 6-6');
            svg.appendChild(p);
        } else if (name === 'arrow-right' || name === 'chevron-right') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'm9 18 6-6-6-6');
            svg.appendChild(p);
        } else if (name === 'reload') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p1.setAttribute('d', 'M3 12a9 9 0 0 1 15.54-6.36l2.46 2.46M21 3v6h-6');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p2.setAttribute('d', 'M21 12a9 9 0 0 1-15.54 6.36l-2.46-2.46M3 21v-6h6');
            svg.appendChild(p1); svg.appendChild(p2);
        } else if (name === 'search') {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '11'); circle.setAttribute('cy', '11'); circle.setAttribute('r', '8');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '21'); line.setAttribute('y1', '21'); line.setAttribute('x2', '16.65'); line.setAttribute('y2', '16.65');
            svg.appendChild(circle); svg.appendChild(line);
        } else if (name === 'chevron-up') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'm18 15-6-6-6 6');
            svg.appendChild(p);
        } else if (name === 'chevron-down') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'm6 9 6 6 6-6');
            svg.appendChild(p);
        } else if (name === 'minimize') {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '5'); line.setAttribute('y1', '12'); line.setAttribute('x2', '19'); line.setAttribute('y2', '12');
            svg.appendChild(line);
        } else if (name === 'maximize') {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '4'); rect.setAttribute('y', '4'); rect.setAttribute('width', '16'); rect.setAttribute('height', '16'); rect.setAttribute('rx', '2');
            svg.appendChild(rect);
        } else if (name === 'close') {
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6'); l1.setAttribute('x2', '6'); l1.setAttribute('y2', '18');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l2.setAttribute('x1', '6'); l2.setAttribute('y1', '6'); l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
            svg.appendChild(l1); svg.appendChild(l2);
        } else if (name === 'minus') {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '5'); line.setAttribute('y1', '12'); line.setAttribute('x2', '19'); line.setAttribute('y2', '12');
            svg.appendChild(line);
        } else if (name === 'plus') {
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l1.setAttribute('x1', '12'); l1.setAttribute('y1', '5'); l1.setAttribute('x2', '12'); l1.setAttribute('y2', '19');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l2.setAttribute('x1', '5'); l2.setAttribute('y1', '12'); l2.setAttribute('x2', '19'); l2.setAttribute('y2', '12');
            svg.appendChild(l1); svg.appendChild(l2);
        } else if (name === 'zoom-in') {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '11'); circle.setAttribute('cy', '11'); circle.setAttribute('r', '8');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '21'); line.setAttribute('y1', '21'); line.setAttribute('x2', '16.65'); line.setAttribute('y2', '16.65');
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l1.setAttribute('x1', '11'); l1.setAttribute('y1', '8'); l1.setAttribute('x2', '11'); l1.setAttribute('y2', '14');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l2.setAttribute('x1', '8'); l2.setAttribute('y1', '11'); l2.setAttribute('x2', '14'); l2.setAttribute('y2', '11');
            svg.appendChild(circle); svg.appendChild(line); svg.appendChild(l1); svg.appendChild(l2);
        } else if (name === 'rotate-ccw') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p1.setAttribute('d', 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p2.setAttribute('d', 'M3 3v5h5');
            svg.appendChild(p1); svg.appendChild(p2);
        }

        return svg;
    }

    function injectOAuthControls() {
        if (!isOAuth && !getIsOAuth()) return;
        if (document.getElementById('qbrowse-oauth-header')) return;
        if (!document.documentElement) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', injectOAuthControls, { once: true });
            }
            return;
        }

        // 1. Inject Custom Minimal Scrollbars & Top Offset
        const style = document.createElement('style');
        style.id = 'qbrowse-oauth-style';
        style.textContent = `
            body {
                padding-top: 54px !important;
                box-sizing: border-box !important;
            }
            /* Clean Minimal Overlay Scrollbars */
            ::-webkit-scrollbar {
                width: 6px !important;
                height: 6px !important;
            }
            ::-webkit-scrollbar-track {
                background: transparent !important;
            }
            ::-webkit-scrollbar-thumb {
                background: rgba(120, 120, 130, 0.40) !important;
                border-radius: 9999px !important;
                transition: background-color 0.2s ease !important;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: rgba(120, 120, 130, 0.70) !important;
            }
            ::-webkit-scrollbar-corner {
                background: transparent !important;
            }
        `;
        const targetHead = document.head || document.documentElement;
        if (targetHead) targetHead.appendChild(style);

        // 2. Build Top Header Container
        const header = document.createElement('div');
        header.id = 'qbrowse-oauth-header';
        header.style.cssText = [
            'position: fixed !important',
            'top: 8px !important',
            'left: 10px !important',
            'right: 10px !important',
            'height: 42px !important',
            'z-index: 2147483647 !important',
            'display: flex !important',
            'align-items: center !important',
            'justify-content: space-between !important',
            'padding: 0 8px !important',
            'border-radius: 9999px !important',
            'user-select: none !important',
            '-webkit-app-region: drag !important',
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif !important',
            'box-sizing: border-box !important',
            'transition: background 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease, color 0.25s ease !important'
        ].join(';');

        // Double-click header to maximize/restore
        header.ondblclick = (e) => {
            if (e.target.closest('button, #qbrowse-oauth-nav-pill, #qbrowse-oauth-close-btn, #qbrowse-oauth-find-bar')) return;
            try { ipcRenderer.send('window-maximize'); } catch (_) {}
        };

        // Close window helper
        const closePopup = () => {
            try { ipcRenderer.send('window-close'); } catch (_) {}
            try { window.close(); } catch (_) {}
        };

        // Window drag engine: Supports both native -webkit-app-region drag and IPC drag
        let isDraggingWindow = false;
        let lastScreenX = 0;
        let lastScreenY = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            // Never initiate window dragging on clickable buttons or the find bar
            if (e.target.closest('button, #qbrowse-oauth-nav-pill, #qbrowse-oauth-close-btn, #qbrowse-oauth-find-bar')) {
                return;
            }

            isDraggingWindow = true;
            lastScreenX = e.screenX;
            lastScreenY = e.screenY;

            const onMouseMove = (moveEvent) => {
                if (!isDraggingWindow) return;
                const deltaX = moveEvent.screenX - lastScreenX;
                const deltaY = moveEvent.screenY - lastScreenY;
                if (deltaX !== 0 || deltaY !== 0) {
                    lastScreenX = moveEvent.screenX;
                    lastScreenY = moveEvent.screenY;
                    try {
                        ipcRenderer.send('window-drag-by', { deltaX, deltaY });
                    } catch (_) {}
                }
            };

            const onMouseUp = () => {
                isDraggingWindow = false;
                window.removeEventListener('mousemove', onMouseMove, true);
                window.removeEventListener('mouseup', onMouseUp, true);
            };

            window.addEventListener('mousemove', onMouseMove, true);
            window.addEventListener('mouseup', onMouseUp, true);
        });

        // --- 3-Section Balanced Structure for Dead-Center Alignment ---
        // Left and Right sections allow window dragging in all empty space around the controls!
        const leftSection = document.createElement('div');
        leftSection.style.cssText = 'display: flex !important; align-items: center !important; justify-content: flex-start !important; flex: 1 !important; min-width: 65px !important; -webkit-app-region: drag !important; cursor: default !important;';

        const centerSection = document.createElement('div');
        centerSection.id = 'centerSection';
        centerSection.style.cssText = 'display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; -webkit-app-region: drag !important; cursor: default !important;';

        const rightSection = document.createElement('div');
        rightSection.style.cssText = 'display: flex !important; align-items: center !important; justify-content: flex-end !important; flex: 1 !important; min-width: 65px !important; -webkit-app-region: drag !important; cursor: default !important;';

        // --- 1. Left: Compact Segmented Navigation Pill [ < | > ] ---
        const navPill = document.createElement('div');
        navPill.id = 'qbrowse-oauth-nav-pill';
        navPill.style.cssText = [
            'display: inline-flex !important',
            'align-items: center !important',
            'height: 30px !important',
            'padding: 0 3px !important',
            'border-radius: 9999px !important',
            '-webkit-app-region: no-drag !important',
            'flex-shrink: 0 !important',
            'gap: 1px !important',
            'transition: background 0.2s ease, border-color 0.2s ease !important'
        ].join(';');

        let currentIsLight = true;

        function createNavButton(iconName, title, onClick) {
            const btn = document.createElement('button');
            btn.title = title;
            btn.style.cssText = [
                '-webkit-app-region: no-drag !important',
                'display: flex !important',
                'align-items: center !important',
                'justify-content: center !important',
                'width: 24px !important',
                'height: 24px !important',
                'border-radius: 9999px !important',
                'background: transparent !important',
                'border: none !important',
                'cursor: pointer !important',
                'transition: all 0.15s ease !important',
                'outline: none !important',
                'padding: 0 !important',
                'flex-shrink: 0 !important'
            ].join(';');

            btn.appendChild(createSvgIcon(iconName, 13));

            btn.onmouseenter = () => {
                btn.style.background = currentIsLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)';
                btn.style.color = currentIsLight ? '#000000' : '#ffffff';
            };
            btn.onmouseleave = () => {
                btn.style.background = 'transparent';
                btn.style.color = currentIsLight ? 'rgba(24, 24, 27, 0.75)' : 'rgba(255, 255, 255, 0.82)';
            };
            btn.onmousedown = () => {
                btn.style.transform = 'scale(0.90)';
            };
            btn.onmouseup = () => {
                btn.style.transform = 'none';
            };

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick(e);
            };

            return btn;
        }

        const backBtn = createNavButton('chevron-left', 'Back (Alt+Left)', () => {
            if (window.history.length > 1) window.history.back();
            try { ipcRenderer.send('oauth-navigate-back'); } catch (_) {}
        });

        const navDivider = document.createElement('div');
        navDivider.style.cssText = 'width: 1px !important; height: 12px !important; margin: 0 2px !important; flex-shrink: 0 !important; transition: background 0.2s ease !important;';

        const fwdBtn = createNavButton('chevron-right', 'Forward (Alt+Right)', () => {
            window.history.forward();
            try { ipcRenderer.send('oauth-navigate-forward'); } catch (_) {}
        });

        const reloadDivider = document.createElement('div');
        reloadDivider.style.cssText = 'width: 1px !important; height: 12px !important; margin: 0 2px !important; flex-shrink: 0 !important; transition: background 0.2s ease !important;';

        const reloadBtn = createNavButton('reload', 'Reload (Ctrl+R)', () => {
            try { window.location.reload(); } catch (_) {
                try { ipcRenderer.send('oauth-reload'); } catch (_) {}
            }
        });

        navPill.appendChild(backBtn);
        navPill.appendChild(navDivider);
        navPill.appendChild(fwdBtn);
        navPill.appendChild(reloadDivider);
        navPill.appendChild(reloadBtn);
        leftSection.appendChild(navPill);

        // --- 2. Center: Sleek Content-Sized Domain Pill [ domain.com ] ---
        const domainPill = document.createElement('div');
        domainPill.id = 'qbrowse-oauth-badge';
        domainPill.style.cssText = [
            'display: inline-flex !important',
            'align-items: center !important',
            'justify-content: center !important',
            'height: 30px !important',
            'padding: 0 14px !important',
            'border-radius: 9999px !important',
            'gap: 6px !important',
            'max-width: 260px !important',
            'overflow: hidden !important',
            'text-overflow: ellipsis !important',
            'white-space: nowrap !important',
            '-webkit-app-region: drag !important',
            'cursor: default !important',
            'user-select: none !important',
            'transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important',
            'box-sizing: border-box !important'
        ].join(';');

        domainPill.onmouseenter = () => {
            domainPill.style.background = currentIsLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.10)';
            domainPill.style.borderColor = currentIsLight ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.14)';
        };
        domainPill.onmouseleave = () => {
            domainPill.style.background = currentIsLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
            domainPill.style.borderColor = currentIsLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';
        };

        const lockIcon = createSvgIcon('lock', 12);
        lockIcon.style.flexShrink = '0';
        lockIcon.style.pointerEvents = 'none';
        lockIcon.style.transition = 'color 0.2s ease';

        const hostSpan = document.createElement('span');
        hostSpan.id = 'qbrowse-oauth-hostname';
        hostSpan.style.cssText = [
            'font-size: 12.5px !important',
            'font-weight: 550 !important',
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
            'letter-spacing: -0.01em !important',
            'overflow: hidden !important',
            'text-overflow: ellipsis !important',
            'white-space: nowrap !important',
            'line-height: 1 !important',
            'pointer-events: none !important',
            'user-select: none !important',
            '-webkit-app-region: drag !important',
            'transition: color 0.2s ease !important'
        ].join(';');

        const getCleanDomain = () => {
            try {
                return (window.location.hostname || '').replace(/^www\./, '') || 'Sign in';
            } catch (_) {
                return 'Sign in';
            }
        };
        hostSpan.textContent = getCleanDomain();

        domainPill.appendChild(lockIcon);
        domainPill.appendChild(hostSpan);
        centerSection.appendChild(domainPill);

        // --- 3. Right: Sleek Window Control Buttons [ - | X ] ---
        rightSection.style.gap = '4px';

        const minBtn = document.createElement('button');
        minBtn.id = 'qbrowse-oauth-min-btn';
        minBtn.title = 'Minimize';
        minBtn.style.cssText = [
            '-webkit-app-region: no-drag !important',
            'display: flex !important',
            'align-items: center !important',
            'justify-content: center !important',
            'width: 30px !important',
            'height: 30px !important',
            'border-radius: 9999px !important',
            'cursor: pointer !important',
            'transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important',
            'outline: none !important',
            'padding: 0 !important',
            'flex-shrink: 0 !important'
        ].join(';');
        minBtn.appendChild(createSvgIcon('minus', 11));

        minBtn.onmouseenter = () => {
            minBtn.style.background = currentIsLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';
            minBtn.style.color = currentIsLight ? '#000000' : '#ffffff';
            minBtn.style.transform = 'scale(1.06)';
        };
        minBtn.onmouseleave = () => {
            minBtn.style.background = currentIsLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
            minBtn.style.color = currentIsLight ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.75)';
            minBtn.style.transform = 'none';
        };
        minBtn.onmousedown = () => { minBtn.style.transform = 'scale(0.92)'; };
        minBtn.onmouseup = () => { minBtn.style.transform = 'scale(1.06)'; };
        minBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            try { ipcRenderer.send('window-minimize'); } catch (_) {}
        };

        const closeBtn = document.createElement('button');
        closeBtn.id = 'qbrowse-oauth-close-btn';
        closeBtn.title = 'Close (Esc)';
        closeBtn.style.cssText = [
            '-webkit-app-region: no-drag !important',
            'display: flex !important',
            'align-items: center !important',
            'justify-content: center !important',
            'width: 30px !important',
            'height: 30px !important',
            'border-radius: 9999px !important',
            'cursor: pointer !important',
            'transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important',
            'outline: none !important',
            'padding: 0 !important',
            'flex-shrink: 0 !important'
        ].join(';');

        closeBtn.appendChild(createSvgIcon('close', 11));

        closeBtn.onmouseenter = () => {
            closeBtn.style.background = currentIsLight ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.24)';
            closeBtn.style.borderColor = currentIsLight ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.45)';
            closeBtn.style.color = currentIsLight ? '#dc2626' : '#f87171';
            closeBtn.style.transform = 'scale(1.06)';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.background = currentIsLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
            closeBtn.style.borderColor = currentIsLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';
            closeBtn.style.color = currentIsLight ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.75)';
            closeBtn.style.transform = 'none';
        };
        closeBtn.onmousedown = () => {
            closeBtn.style.transform = 'scale(0.92)';
        };
        closeBtn.onmouseup = () => {
            closeBtn.style.transform = 'scale(1.06)';
        };

        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closePopup();
        };

        rightSection.appendChild(minBtn);
        rightSection.appendChild(closeBtn);

        // Assemble TopBar (Left: Nav Pill, Center: Centered Domain Pill, Right: Close Button)
        header.appendChild(leftSection);
        header.appendChild(centerSection);
        header.appendChild(rightSection);

        document.documentElement.appendChild(header);

        // Zoom & Find In Page engines
        let currentOAuthZoom = 1.0;
        try {
            currentOAuthZoom = webFrame.getZoomFactor() || 1.0;
        } catch (_) {}
        let targetOAuthZoom = currentOAuthZoom;
        let oauthZoomStartFactor = currentOAuthZoom;
        let oauthZoomStartTime = 0;
        const oauthZoomDuration = 200;
        let oauthZoomRaf = null;

        let oauthZoomContainer = null;
        let oauthZoomHud = null;
        let oauthZoomHudTimer = null;
        let oauthZoomPctEl = null;
        let oauthZoomResetBtn = null;
        let oauthZoomMinusBtn = null;
        let oauthZoomPlusBtn = null;
        let oauthZoomDivider = null;

        const applyOAuthZoomHudTheme = (isLight) => {
            if (!oauthZoomHud) return;
            if (isLight) {
                oauthZoomHud.style.setProperty('background', 'rgba(255, 255, 255, 0.90)', 'important');
                oauthZoomHud.style.setProperty('backdrop-filter', 'blur(40px) saturate(180%)', 'important');
                oauthZoomHud.style.setProperty('-webkit-backdrop-filter', 'blur(40px) saturate(180%)', 'important');
                oauthZoomHud.style.setProperty('border', '1px solid rgba(0, 0, 0, 0.10)', 'important');
                oauthZoomHud.style.setProperty('box-shadow', '0 15px 35px rgba(0, 0, 0, 0.12)', 'important');
                oauthZoomHud.style.setProperty('color', '#27272a', 'important');

                if (oauthZoomDivider) {
                    oauthZoomDivider.style.setProperty('border-left', '1px solid rgba(0, 0, 0, 0.10)', 'important');
                }
                if (oauthZoomMinusBtn) {
                    oauthZoomMinusBtn.style.setProperty('color', '#3f3f46', 'important');
                    oauthZoomMinusBtn.onmouseenter = () => {
                        oauthZoomMinusBtn.style.setProperty('background', 'rgba(0, 0, 0, 0.05)', 'important');
                        oauthZoomMinusBtn.style.setProperty('color', '#18181b', 'important');
                    };
                    oauthZoomMinusBtn.onmouseleave = () => {
                        oauthZoomMinusBtn.style.setProperty('background', 'transparent', 'important');
                        oauthZoomMinusBtn.style.setProperty('color', '#3f3f46', 'important');
                    };
                }
                if (oauthZoomPlusBtn) {
                    oauthZoomPlusBtn.style.setProperty('color', '#3f3f46', 'important');
                    oauthZoomPlusBtn.onmouseenter = () => {
                        oauthZoomPlusBtn.style.setProperty('background', 'rgba(0, 0, 0, 0.05)', 'important');
                        oauthZoomPlusBtn.style.setProperty('color', '#18181b', 'important');
                    };
                    oauthZoomPlusBtn.onmouseleave = () => {
                        oauthZoomPlusBtn.style.setProperty('background', 'transparent', 'important');
                        oauthZoomPlusBtn.style.setProperty('color', '#3f3f46', 'important');
                    };
                }
            } else {
                oauthZoomHud.style.setProperty('background', 'rgba(18, 18, 22, 0.90)', 'important');
                oauthZoomHud.style.setProperty('backdrop-filter', 'blur(40px) saturate(180%)', 'important');
                oauthZoomHud.style.setProperty('-webkit-backdrop-filter', 'blur(40px) saturate(180%)', 'important');
                oauthZoomHud.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.15)', 'important');
                oauthZoomHud.style.setProperty('box-shadow', '0 15px 35px rgba(0, 0, 0, 0.70)', 'important');
                oauthZoomHud.style.setProperty('color', '#ffffff', 'important');

                if (oauthZoomDivider) {
                    oauthZoomDivider.style.setProperty('border-left', '1px solid rgba(255, 255, 255, 0.10)', 'important');
                }
                if (oauthZoomMinusBtn) {
                    oauthZoomMinusBtn.style.setProperty('color', '#ffffff', 'important');
                    oauthZoomMinusBtn.onmouseenter = () => {
                        oauthZoomMinusBtn.style.setProperty('background', 'rgba(255, 255, 255, 0.10)', 'important');
                        oauthZoomMinusBtn.style.setProperty('color', '#ffffff', 'important');
                    };
                    oauthZoomMinusBtn.onmouseleave = () => {
                        oauthZoomMinusBtn.style.setProperty('background', 'transparent', 'important');
                        oauthZoomMinusBtn.style.setProperty('color', '#ffffff', 'important');
                    };
                }
                if (oauthZoomPlusBtn) {
                    oauthZoomPlusBtn.style.setProperty('color', '#ffffff', 'important');
                    oauthZoomPlusBtn.onmouseenter = () => {
                        oauthZoomPlusBtn.style.setProperty('background', 'rgba(255, 255, 255, 0.10)', 'important');
                        oauthZoomPlusBtn.style.setProperty('color', '#ffffff', 'important');
                    };
                    oauthZoomPlusBtn.onmouseleave = () => {
                        oauthZoomPlusBtn.style.setProperty('background', 'transparent', 'important');
                        oauthZoomPlusBtn.style.setProperty('color', '#ffffff', 'important');
                    };
                }
            }
        };

        let animateOAuthZoom = null;

        const createOAuthZoomHud = () => {
            if (oauthZoomContainer && document.contains(oauthZoomContainer)) return;

            oauthZoomContainer = document.createElement('div');
            oauthZoomContainer.id = 'qbrowse-oauth-zoom-container';
            oauthZoomContainer.style.cssText = [
                'position: fixed !important',
                'z-index: 2147483647 !important',
                'bottom: 32px !important',
                'right: 32px !important',
                'pointer-events: none !important',
                'transform-origin: bottom right !important',
                'box-sizing: border-box !important'
            ].join(';');

            oauthZoomHud = document.createElement('div');
            oauthZoomHud.id = 'qbrowse-oauth-zoom-hud';
            oauthZoomHud.style.cssText = [
                'display: flex !important',
                'align-items: center !important',
                'gap: 10px !important',
                'padding: 8px 14px !important',
                'border-radius: 16px !important',
                'user-select: none !important',
                '-webkit-user-select: none !important',
                'box-sizing: border-box !important',
                'transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1) !important',
                'opacity: 0 !important',
                'transform: translateY(12px) scale(0.95) !important',
                'pointer-events: none !important'
            ].join(';');

            const icon = createSvgIcon('zoom-in', 14);
            icon.style.cssText = [
                'color: #d4bc94 !important',
                'flex-shrink: 0 !important',
                'display: block !important'
            ].join(';');
            oauthZoomHud.appendChild(icon);

            oauthZoomPctEl = document.createElement('span');
            oauthZoomPctEl.id = 'qbrowse-oauth-zoom-pct';
            oauthZoomPctEl.style.cssText = [
                'font-size: 12px !important',
                'font-weight: 700 !important',
                'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important',
                'letter-spacing: -0.025em !important',
                'min-width: 42px !important',
                'text-align: center !important',
                'user-select: none !important',
                'line-height: 1 !important',
                'display: inline-block !important'
            ].join(';');
            oauthZoomPctEl.textContent = '100%';
            oauthZoomHud.appendChild(oauthZoomPctEl);

            const btnGroup = document.createElement('div');
            btnGroup.id = 'qbrowse-oauth-zoom-actions';
            btnGroup.style.cssText = [
                'display: flex !important',
                'align-items: center !important',
                'gap: 4px !important',
                'padding-left: 8px !important',
                'border-left: 1px solid rgba(255, 255, 255, 0.10) !important'
            ].join(';');
            oauthZoomDivider = btnGroup;

            oauthZoomMinusBtn = document.createElement('button');
            oauthZoomMinusBtn.id = 'qbrowse-oauth-zoom-out-btn';
            oauthZoomMinusBtn.title = 'Zoom Out (Ctrl -)';
            oauthZoomMinusBtn.textContent = '-';
            oauthZoomMinusBtn.style.cssText = [
                'width: 24px !important',
                'height: 24px !important',
                'border-radius: 8px !important',
                'display: flex !important',
                'align-items: center !important',
                'justify-content: center !important',
                'font-size: 12px !important',
                'font-weight: 700 !important',
                'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
                'cursor: pointer !important',
                'border: none !important',
                'outline: none !important',
                'padding: 0 !important',
                'background: transparent !important',
                'transition: all 0.15s ease !important',
                'line-height: 1 !important'
            ].join(';');
            oauthZoomMinusBtn.onmousedown = () => { oauthZoomMinusBtn.style.transform = 'scale(0.95)'; };
            oauthZoomMinusBtn.onmouseup = () => { oauthZoomMinusBtn.style.transform = 'none'; };
            oauthZoomMinusBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof animateOAuthZoom === 'function') animateOAuthZoom(targetOAuthZoom - 0.1);
            };
            btnGroup.appendChild(oauthZoomMinusBtn);

            oauthZoomPlusBtn = document.createElement('button');
            oauthZoomPlusBtn.id = 'qbrowse-oauth-zoom-in-btn';
            oauthZoomPlusBtn.title = 'Zoom In (Ctrl +)';
            oauthZoomPlusBtn.textContent = '+';
            oauthZoomPlusBtn.style.cssText = [
                'width: 24px !important',
                'height: 24px !important',
                'border-radius: 8px !important',
                'display: flex !important',
                'align-items: center !important',
                'justify-content: center !important',
                'font-size: 12px !important',
                'font-weight: 700 !important',
                'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
                'cursor: pointer !important',
                'border: none !important',
                'outline: none !important',
                'padding: 0 !important',
                'background: transparent !important',
                'transition: all 0.15s ease !important',
                'line-height: 1 !important'
            ].join(';');
            oauthZoomPlusBtn.onmousedown = () => { oauthZoomPlusBtn.style.transform = 'scale(0.95)'; };
            oauthZoomPlusBtn.onmouseup = () => { oauthZoomPlusBtn.style.transform = 'none'; };
            oauthZoomPlusBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof animateOAuthZoom === 'function') animateOAuthZoom(targetOAuthZoom + 0.1);
            };
            btnGroup.appendChild(oauthZoomPlusBtn);

            oauthZoomResetBtn = document.createElement('button');
            oauthZoomResetBtn.id = 'qbrowse-oauth-zoom-reset-btn';
            oauthZoomResetBtn.title = 'Reset Zoom (Ctrl 0)';
            oauthZoomResetBtn.style.cssText = [
                'display: none !important',
                'align-items: center !important',
                'gap: 4px !important',
                'padding: 2px 8px !important',
                'border-radius: 8px !important',
                'font-size: 10px !important',
                'font-weight: 700 !important',
                'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
                'text-transform: uppercase !important',
                'letter-spacing: 0.05em !important',
                'background: rgba(212, 188, 148, 0.20) !important',
                'color: #d4bc94 !important',
                'border: none !important',
                'outline: none !important',
                'cursor: pointer !important',
                'margin-left: 4px !important',
                'transition: all 0.15s ease !important',
                'line-height: 1.2 !important'
            ].join(';');
            oauthZoomResetBtn.appendChild(createSvgIcon('rotate-ccw', 10));
            oauthZoomResetBtn.appendChild(document.createTextNode('Reset'));

            oauthZoomResetBtn.onmouseenter = () => {
                oauthZoomResetBtn.style.setProperty('background', 'rgba(212, 188, 148, 0.30)', 'important');
            };
            oauthZoomResetBtn.onmouseleave = () => {
                oauthZoomResetBtn.style.setProperty('background', 'rgba(212, 188, 148, 0.20)', 'important');
            };
            oauthZoomResetBtn.onmousedown = () => { oauthZoomResetBtn.style.transform = 'scale(0.95)'; };
            oauthZoomResetBtn.onmouseup = () => { oauthZoomResetBtn.style.transform = 'none'; };
            oauthZoomResetBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof animateOAuthZoom === 'function') animateOAuthZoom(1.0);
            };
            btnGroup.appendChild(oauthZoomResetBtn);

            oauthZoomHud.appendChild(btnGroup);

            oauthZoomHud.onmouseenter = () => {
                clearTimeout(oauthZoomHudTimer);
            };
            oauthZoomHud.onmouseleave = () => {
                clearTimeout(oauthZoomHudTimer);
                oauthZoomHudTimer = setTimeout(() => {
                    hideOAuthZoomHud();
                }, 1800);
            };

            oauthZoomContainer.appendChild(oauthZoomHud);
            (document.body || document.documentElement).appendChild(oauthZoomContainer);

            applyOAuthZoomHudTheme(currentIsLight);
        };

        const hideOAuthZoomHud = () => {
            if (!oauthZoomHud) return;
            oauthZoomHud.style.setProperty('opacity', '0', 'important');
            oauthZoomHud.style.setProperty('transform', 'translateY(12px) scale(0.95)', 'important');
            oauthZoomHud.style.setProperty('pointer-events', 'none', 'important');
        };

        const showOAuthZoomHud = (factor, invZ) => {
            try {
                if (!oauthZoomContainer || !document.contains(oauthZoomContainer)) {
                    createOAuthZoomHud();
                }

                const pct = Math.round(factor * 100);
                if (oauthZoomPctEl) {
                    oauthZoomPctEl.textContent = `${pct}%`;
                }
                if (oauthZoomResetBtn) {
                    oauthZoomResetBtn.style.setProperty('display', pct !== 100 ? 'flex' : 'none', 'important');
                }

                oauthZoomContainer.style.setProperty('bottom', `${32 * invZ}px`, 'important');
                oauthZoomContainer.style.setProperty('right', `${32 * invZ}px`, 'important');
                oauthZoomContainer.style.setProperty('transform', `scale(${invZ})`, 'important');

                oauthZoomHud.style.setProperty('opacity', '1', 'important');
                oauthZoomHud.style.setProperty('transform', 'translateY(0) scale(1)', 'important');
                oauthZoomHud.style.setProperty('pointer-events', 'auto', 'important');

                clearTimeout(oauthZoomHudTimer);
                oauthZoomHudTimer = setTimeout(() => {
                    hideOAuthZoomHud();
                }, 1800);
            } catch (_) {}
        };

        const updateOAuthChromeIsolation = (factor, showHud = true) => {
            const safeFactor = Math.max(0.2, factor);
            const invZ = 1 / safeFactor;
            if (header) {
                header.style.setProperty('transform', `scale(${invZ})`, 'important');
                header.style.setProperty('transform-origin', '0 0', 'important');
                header.style.setProperty('width', `calc(100vw * ${factor} - 20px)`, 'important');
                header.style.setProperty('top', `${8 * invZ}px`, 'important');
                header.style.setProperty('left', `${10 * invZ}px`, 'important');
                header.style.setProperty('right', 'auto', 'important');
            }
            if (findBar) {
                findBar.style.setProperty('transform', `scale(${invZ})`, 'important');
                findBar.style.setProperty('transform-origin', 'top right', 'important');
                findBar.style.setProperty('top', `${56 * invZ}px`, 'important');
                findBar.style.setProperty('right', `${12 * invZ}px`, 'important');
            }
            if (document.body) {
                document.body.style.setProperty('padding-top', `${54 * invZ}px`, 'important');
            }
            if (showHud) {
                showOAuthZoomHud(factor, invZ);
            }
        };

        const OAUTH_ZOOM_STEPS = [0.25, 0.33, 0.50, 0.67, 0.75, 0.80, 0.90, 1.00, 1.10, 1.25, 1.50, 1.75, 2.00, 2.50, 3.00, 4.00, 5.00];
        const getNextOAuthZoomStep = (cur, dir) => {
            if (dir > 0) return OAUTH_ZOOM_STEPS.find(s => s > cur + 0.005) || 5.00;
            if (dir < 0) return [...OAUTH_ZOOM_STEPS].reverse().find(s => s < cur - 0.005) || 0.25;
            return 1.00;
        };

        const applyOAuthZoomStep = (direction) => {
            const next = direction === 0 ? 1.00 : getNextOAuthZoomStep(targetOAuthZoom, direction);
            targetOAuthZoom = next;
            currentOAuthZoom = next;
            try { webFrame.setZoomFactor(next); } catch (_) {}
            updateOAuthChromeIsolation(next, true);
        };

        const applyZoom = (newFactor) => {
            const target = Math.min(5.0, Math.max(0.25, newFactor));
            targetOAuthZoom = target;
            currentOAuthZoom = target;
            try { webFrame.setZoomFactor(target); } catch (_) {}
            updateOAuthChromeIsolation(target, true);
        };

        try {
            ipcRenderer.on('oauth-zoom-command', (event, action) => {
                if (action === 'in') {
                    applyOAuthZoomStep(1);
                } else if (action === 'out') {
                    applyOAuthZoomStep(-1);
                } else if (action === 'reset') {
                    applyOAuthZoomStep(0);
                }
            });
        } catch (_) {}

        let isFindBarOpen = false;
        let findBar = null;
        let findInput = null;
        let findCounter = null;
        let findSearchIcon = null;
        let findButtons = [];

        const toggleFindBar = () => {
            if (!findBar) createFindBar();
            isFindBarOpen = !isFindBarOpen;
            if (isFindBarOpen) {
                findBar.style.display = 'flex';
                setTimeout(() => { if (findInput) { findInput.focus(); findInput.select(); } }, 50);
            } else {
                closeFindBar();
            }
        };

        const closeFindBar = () => {
            isFindBarOpen = false;
            if (findBar) findBar.style.display = 'none';
            try { ipcRenderer.send('oauth-stop-find-in-page', 'clearSelection'); } catch (_) {}
        };

        // 3. Build Floating Find In Page Bar (Floats cleanly below the header)
        function createFindBar() {
            if (findBar) return;
            findBar = document.createElement('div');
            findBar.id = 'qbrowse-oauth-find-bar';
            findBar.style.cssText = [
                'position: fixed !important',
                'top: 56px !important',
                'right: 12px !important',
                'z-index: 2147483647 !important',
                'display: none !important',
                'align-items: center !important',
                'gap: 4px !important',
                'padding: 3px 6px !important',
                'border-radius: 12px !important',
                'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
                'user-select: none !important',
                'transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important'
            ].join(';');

            findSearchIcon = createSvgIcon('search', 12);
            findSearchIcon.style.flexShrink = '0';
            findSearchIcon.style.margin = '0 2px';

            findInput = document.createElement('input');
            findInput.type = 'text';
            findInput.placeholder = 'Find in page...';
            findInput.style.cssText = [
                'background: transparent !important',
                'border: none !important',
                'outline: none !important',
                'font-size: 11px !important',
                'width: 125px !important',
                'padding: 2px 4px !important'
            ].join(';');

            findCounter = document.createElement('span');
            findCounter.textContent = '0/0';
            findCounter.style.cssText = 'font-size: 10px !important; font-family: monospace !important; padding: 0 4px !important; flex-shrink: 0 !important;';

            let debounceTimer = null;
            const performFind = (forward = true, findNext = false) => {
                const text = findInput.value.trim();
                if (!text) {
                    findCounter.textContent = '0/0';
                    findCounter.style.color = currentIsLight ? 'rgba(0, 0, 0, 0.50)' : 'rgba(255, 255, 255, 0.45)';
                    try { ipcRenderer.send('oauth-stop-find-in-page', 'clearSelection'); } catch (_) {}
                    return;
                }
                try {
                    ipcRenderer.send('oauth-find-in-page', { text, forward, findNext });
                } catch (_) {}
            };

            findInput.oninput = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => performFind(true, false), 40);
            };

            findInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performFind(!e.shiftKey, true);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeFindBar();
                }
            };

            function createFindBtn(iconName, title, onClick) {
                const btn = document.createElement('button');
                btn.title = title;
                btn.style.cssText = [
                    '-webkit-app-region: no-drag !important',
                    'display: flex !important',
                    'align-items: center !important',
                    'justify-content: center !important',
                    'width: 20px !important',
                    'height: 20px !important',
                    'border-radius: 9999px !important',
                    'background: transparent !important',
                    'border: none !important',
                    'cursor: pointer !important',
                    'transition: all 0.15s ease !important',
                    'outline: none !important',
                    'padding: 0 !important',
                    'flex-shrink: 0 !important'
                ].join(';');
                btn.appendChild(createSvgIcon(iconName, 11));
                btn.onmouseenter = () => {
                    btn.style.background = currentIsLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';
                    btn.style.color = currentIsLight ? '#000000' : '#ffffff';
                };
                btn.onmouseleave = () => {
                    btn.style.background = 'transparent';
                    btn.style.color = currentIsLight ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.70)';
                };
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClick(e);
                };
                findButtons.push(btn);
                return btn;
            }

            const prevBtn = createFindBtn('chevron-up', 'Previous match (Shift+Enter)', () => {
                performFind(false, true);
            });

            const nextBtn = createFindBtn('chevron-down', 'Next match (Enter)', () => {
                performFind(true, true);
            });

            const closeFindBtn = createFindBtn('close', 'Close (Esc)', () => {
                closeFindBar();
            });

            findBar.appendChild(findSearchIcon);
            findBar.appendChild(findInput);
            findBar.appendChild(findCounter);
            findBar.appendChild(prevBtn);
            findBar.appendChild(nextBtn);
            findBar.appendChild(closeFindBtn);

            document.documentElement.appendChild(findBar);

            // Listen for native find results from main process
            ipcRenderer.on('oauth-found-in-page-result', (event, data) => {
                if (!findCounter) return;
                const matches = data.matches || 0;
                const active = data.activeMatchOrdinal || 0;
                findCounter.textContent = `${active}/${matches}`;
                if (matches === 0 && findInput && findInput.value.trim().length > 0) {
                    findCounter.style.color = '#f87171';
                } else if (matches > 0) {
                    findCounter.style.color = currentIsLight ? '#059669' : '#34d399';
                } else {
                    findCounter.style.color = currentIsLight ? 'rgba(0, 0, 0, 0.50)' : 'rgba(255, 255, 255, 0.45)';
                }
            });

            // Apply current theme to newly created find bar
            applyTheme(currentIsLight);
        }

        // --- 4. Adaptive Frosted Glass Theme Engine ---
        function detectPageIsLight() {
            try {
                const html = document.documentElement;
                if (html && html.classList.contains('qbrowse-smart-dark-active')) return false;
                if (html && (html.classList.contains('dark') || html.getAttribute('data-theme') === 'dark')) return false;
                if (html && (html.classList.contains('light') || html.getAttribute('data-theme') === 'light')) return true;

                const elements = [document.body, document.documentElement].filter(Boolean);
                for (const el of elements) {
                    const bg = window.getComputedStyle(el).backgroundColor;
                    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
                        const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                        if (m) {
                            const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
                            if (a > 0.1) {
                                const lum = 0.299 * parseInt(m[1], 10) + 0.587 * parseInt(m[2], 10) + 0.114 * parseInt(m[3], 10);
                                return lum > 130;
                            }
                        }
                    }
                }
                return true;
            } catch (_) {
                return true;
            }
        }

        function applyTheme(isLight) {
            currentIsLight = isLight;

            if (isLight) {
                // LIGHT FROSTED GLASS (Matches ContextMenu isBright & liquid-glass-bright)
                header.style.background = 'rgba(255, 255, 255, 0.78)';
                header.style.backdropFilter = 'blur(28px) saturate(180%)';
                header.style.webkitBackdropFilter = 'blur(28px) saturate(180%)';
                header.style.border = '1px solid rgba(0, 0, 0, 0.08)';
                header.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)';
                header.style.color = '#18181b';

                navPill.style.background = 'rgba(0, 0, 0, 0.04)';
                navPill.style.border = '1px solid rgba(0, 0, 0, 0.06)';
                navDivider.style.background = 'rgba(0, 0, 0, 0.08)';
                if (typeof reloadDivider !== 'undefined' && reloadDivider) reloadDivider.style.background = 'rgba(0, 0, 0, 0.08)';

                backBtn.style.color = 'rgba(24, 24, 27, 0.75)';
                fwdBtn.style.color = 'rgba(24, 24, 27, 0.75)';
                if (typeof reloadBtn !== 'undefined' && reloadBtn) reloadBtn.style.color = 'rgba(24, 24, 27, 0.75)';

                domainPill.style.background = 'rgba(0, 0, 0, 0.04)';
                domainPill.style.border = '1px solid rgba(0, 0, 0, 0.06)';
                lockIcon.style.color = '#059669';
                hostSpan.style.color = '#18181b';

                if (typeof minBtn !== 'undefined' && minBtn) {
                    minBtn.style.background = 'rgba(0, 0, 0, 0.04)';
                    minBtn.style.border = '1px solid rgba(0, 0, 0, 0.06)';
                    minBtn.style.color = 'rgba(24, 24, 27, 0.65)';
                }

                closeBtn.style.background = 'rgba(0, 0, 0, 0.04)';
                closeBtn.style.border = '1px solid rgba(0, 0, 0, 0.06)';
                closeBtn.style.color = 'rgba(24, 24, 27, 0.65)';

                if (findBar) {
                    findBar.style.background = 'rgba(255, 255, 255, 0.88)';
                    findBar.style.backdropFilter = 'blur(28px) saturate(180%)';
                    findBar.style.webkitBackdropFilter = 'blur(28px) saturate(180%)';
                    findBar.style.border = '1px solid rgba(0, 0, 0, 0.10)';
                    findBar.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95)';
                    if (findInput) findInput.style.color = '#18181b';
                    if (findCounter) findCounter.style.color = 'rgba(0, 0, 0, 0.50)';
                    if (findSearchIcon) findSearchIcon.style.color = 'rgba(0, 0, 0, 0.40)';
                    findButtons.forEach(b => { b.style.color = 'rgba(0, 0, 0, 0.65)'; });
                }

                applyOAuthZoomHudTheme(true);
            } else {
                // DARK FROSTED GLASS (Matches ContextMenu dark & liquid-glass-dark)
                header.style.background = 'rgba(15, 16, 23, 0.82)';
                header.style.backdropFilter = 'blur(28px) saturate(160%)';
                header.style.webkitBackdropFilter = 'blur(28px) saturate(160%)';
                header.style.border = '1px solid rgba(255, 255, 255, 0.12)';
                header.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                header.style.color = '#ffffff';

                navPill.style.background = 'rgba(255, 255, 255, 0.06)';
                navPill.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                navDivider.style.background = 'rgba(255, 255, 255, 0.12)';
                if (typeof reloadDivider !== 'undefined' && reloadDivider) reloadDivider.style.background = 'rgba(255, 255, 255, 0.12)';

                backBtn.style.color = 'rgba(255, 255, 255, 0.82)';
                fwdBtn.style.color = 'rgba(255, 255, 255, 0.82)';
                if (typeof reloadBtn !== 'undefined' && reloadBtn) reloadBtn.style.color = 'rgba(255, 255, 255, 0.82)';

                domainPill.style.background = 'rgba(255, 255, 255, 0.06)';
                domainPill.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                lockIcon.style.color = '#34d399';
                hostSpan.style.color = 'rgba(255, 255, 255, 0.92)';

                if (typeof minBtn !== 'undefined' && minBtn) {
                    minBtn.style.background = 'rgba(255, 255, 255, 0.06)';
                    minBtn.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                    minBtn.style.color = 'rgba(255, 255, 255, 0.75)';
                }

                closeBtn.style.background = 'rgba(255, 255, 255, 0.06)';
                closeBtn.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                closeBtn.style.color = 'rgba(255, 255, 255, 0.75)';

                if (findBar) {
                    findBar.style.background = 'rgba(15, 16, 23, 0.94)';
                    findBar.style.backdropFilter = 'blur(28px) saturate(180%)';
                    findBar.style.webkitBackdropFilter = 'blur(28px) saturate(180%)';
                    findBar.style.border = '1px solid rgba(255, 255, 255, 0.12)';
                    findBar.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
                    if (findInput) findInput.style.color = '#ffffff';
                    if (findCounter) findCounter.style.color = 'rgba(255, 255, 255, 0.45)';
                    if (findSearchIcon) findSearchIcon.style.color = 'rgba(255, 255, 255, 0.40)';
                    findButtons.forEach(b => { b.style.color = 'rgba(255, 255, 255, 0.70)'; });
                }

                applyOAuthZoomHudTheme(false);
            }
        }

        const updateTheme = () => {
            const isLight = detectPageIsLight();
            if (isLight !== currentIsLight) {
                applyTheme(isLight);
            }
        };

        updateOAuthThemeGlobal = updateTheme;

        // Initialize theme
        applyTheme(detectPageIsLight());
        window.addEventListener('load', updateTheme);

        // Fetch smart dark mode state from main process on startup
        if (isOAuthPopup) {
            try {
                ipcRenderer.invoke('get-smart-dark-state', window.location.href)
                    .then(state => {
                        if (state && typeof state.isForceDark === 'boolean') {
                            checkSmartDark(state.isForceDark, state.isExcluded);
                            updateTheme();
                        }
                    })
                    .catch(() => {});
            } catch (_) {}
        }

        let themeDebounce = null;
        const themeObserver = new MutationObserver(() => {
            clearTimeout(themeDebounce);
            themeDebounce = setTimeout(updateTheme, 80);
        });
        if (document.documentElement) {
            themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        }
        if (document.body) {
            themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
        }

        // 5. Update Hostname on Navigation
        const updateHost = () => {
            const h = document.getElementById('qbrowse-oauth-hostname');
            if (h && window.location.hostname) {
                h.textContent = window.location.hostname.replace(/^www\./, '');
            }
            updateTheme();
        };
        window.addEventListener('popstate', updateHost);
        window.addEventListener('hashchange', updateHost);
        document.addEventListener('DOMContentLoaded', updateHost);

        // 5. Global Keyboard & Mouse Shortcuts inside OAuth Popup
        window.addEventListener('keydown', (e) => {
            // Find in page (Ctrl+F)
            if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
                e.preventDefault();
                toggleFindBar();
                return;
            }

            // Zoom In (Ctrl++ / Ctrl+=)
            if (e.ctrlKey && (e.key === '=' || e.key === '+' || e.key === 'Add')) {
                e.preventDefault();
                applyOAuthZoomStep(1);
                return;
            }

            // Zoom Out (Ctrl+-)
            if (e.ctrlKey && (e.key === '-' || e.key === 'Subtract')) {
                e.preventDefault();
                applyOAuthZoomStep(-1);
                return;
            }

            // Zoom Reset (Ctrl+0)
            if (e.ctrlKey && (e.key === '0' || e.key === 'num0')) {
                e.preventDefault();
                applyOAuthZoomStep(0);
                return;
            }

            // Reload (F5 / Ctrl+R)
            if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
                e.preventDefault();
                try { window.location.reload(); } catch (_) {
                    try { ipcRenderer.send('oauth-reload'); } catch (_) {}
                }
                return;
            }

            // Back (Alt+Left)
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                if (window.history.length > 1) window.history.back();
                try { ipcRenderer.send('oauth-navigate-back'); } catch (_) {}
                return;
            }

            // Forward (Alt+Right)
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                window.history.forward();
                try { ipcRenderer.send('oauth-navigate-forward'); } catch (_) {}
                return;
            }

            // Escape
            if (e.key === 'Escape') {
                if (isFindBarOpen) {
                    e.preventDefault();
                    closeFindBar();
                } else {
                    e.preventDefault();
                    closePopup();
                }
            }
        }, true);

        // Zoom via Ctrl + Wheel
        window.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const step = e.deltaY < 0 ? 0.1 : -0.1;
                animateOAuthZoom(targetOAuthZoom + step);
            }
        }, { passive: false });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectOAuthControls);
    } else {
        injectOAuthControls();
    }
    window.addEventListener('load', injectOAuthControls);
})();

// Link-to-App Redirect & Custom Protocol Click Interceptor
(function setupAppProtocolInterceptors() {
    const INTERNAL_SCHEMES = new Set([
        'http:', 'https:', 'qbrowse:', 'about:', 'chrome:', 'data:', 'blob:', 'javascript:', 'file:', 'ws:', 'wss:'
    ]);
    const DANGEROUS_SCHEMES = new Set([
        'file:', 'javascript:', 'data:', 'vbscript:', 'powershell:', 'cmd:', 'ms-msdt:', 'search-ms:', 'shell:', 'disk:', 'con:', 'prn:', 'aux:', 'nul:'
    ]);

    function isAppProtocol(urlStr) {
        if (!urlStr || typeof urlStr !== 'string' || /[\r\n\0]/.test(urlStr)) return false;
        const match = urlStr.trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
        if (!match) return false;
        const proto = match[1].toLowerCase() + ':';
        return !INTERNAL_SCHEMES.has(proto) && !DANGEROUS_SCHEMES.has(proto);
    }

    // Capture clicks on <a href="custom-protocol:..."> before navigation triggers ERR_UNKNOWN_URL_SCHEME
    document.addEventListener('click', (e) => {
        try {
            const anchor = e.target && e.target.closest ? e.target.closest('a') : null;
            if (anchor && anchor.href && isAppProtocol(anchor.href)) {
                e.preventDefault();
                e.stopPropagation();
                ipcRenderer.invoke('open-app-protocol', { protocolUrl: anchor.href });
            }
        } catch (_) {}
    }, true);
})();



// Terminal debug logger for social auth buttons (Google, Apple, Facebook, etc.)
try {
    document.addEventListener('click', (e) => {
        try {
            const btn = e.target && e.target.closest ? e.target.closest('button, [role="button"], a') : null;
            if (!btn) return;
            const text = ((btn.innerText || btn.getAttribute('aria-label') || '') + '').toLowerCase().trim();
            const testId = (btn.getAttribute('data-test-id') || '').toLowerCase();
            if (text.includes('google') || testId.includes('google') || text.includes('kontynuuj przez google')) {
                ipcRenderer.send('debug-terminal-log', `[WebView Click] Google Auth button clicked on ${window.location.hostname}`, {
                    buttonText: (btn.innerText || btn.getAttribute('aria-label') || '').trim(),
                    testId: btn.getAttribute('data-test-id') || '(none)',
                    tag: btn.tagName
                });
            }
        } catch (_) {}
    }, true);
} catch (_) {}

// Native Adblocker DOM Placeholder Collapser
// Eliminates blank/grey empty boxes left by blocked ad scripts and iframes
(function setupAdPlaceholderCollapser() {
    try {
        if (isOAuthPopup || isGoogleAuth) return;
        const href = (typeof window !== 'undefined' && window.location && window.location.href) || '';
        if (
            href.startsWith('chrome:') ||
            href.startsWith('qbrowse:') ||
            href.startsWith('about:') ||
            href.includes('docs.google.com') ||
            href.includes('drive.google.com') ||
            href.includes('mail.google.com')
        ) {
            return;
        }

        const AD_SELECTORS = [
            'ins.adsbygoogle',
            '[data-ad-slot]',
            '[data-ad-unit]',
            '[data-ad-client]',
            '[data-ad-format]',
            '[data-google-query-id]',
            'iframe[id*="google_ads"]',
            'iframe[id*="aswift_"]',
            'iframe[src*="doubleclick.net"]',
            'iframe[src*="googlesyndication.com"]',
            'iframe[src*="adnxs.com"]',
            'iframe[src*="criteo."]',
            'div[id^="google_ads_iframe"]',
            'div[id^="aswift_"]',
            'div[id^="gpt-ad"]',
            'div[class*="gpt-ad"]',
            '.ad-container',
            '.ad-placeholder',
            '.ad-wrapper',
            '.advertisement',
            '.ad-banner',
            '[class*="AdSlot"]',
            '[class*="ad-slot"]',
            '[class*="ad_slot"]',
            '[class*="Billboard"]',
            '[id*="Billboard"]',
            '[class*="screeningWallpaper"]',
            '[class*="wp-header-panel"]',
            '[class*="bmjdxfegh"]'
        ].join(',');

        function collapseElement(el) {
            if (!el || el.dataset.qbCollapsed === 'true') return;
            try {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('height', '0px', 'important');
                el.style.setProperty('min-height', '0px', 'important');
                el.style.setProperty('max-height', '0px', 'important');
                el.style.setProperty('margin', '0px', 'important');
                el.style.setProperty('padding', '0px', 'important');
                el.style.setProperty('border', 'none', 'important');
                el.style.setProperty('opacity', '0', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
                el.dataset.qbCollapsed = 'true';

                // Check and safely collapse parent wrapper if it is explicitly an empty ad container
                const parent = el.parentElement;
                if (
                    parent &&
                    parent !== document.body &&
                    parent !== document.documentElement &&
                    parent.dataset.qbCollapsed !== 'true' &&
                    !['BODY', 'HTML', 'MAIN', 'NAV', 'HEADER', 'FOOTER', 'ARTICLE', 'SECTION', 'ASIDE', 'FORM', 'UL', 'OL', 'TABLE'].includes(parent.tagName)
                ) {
                    const parentClass = typeof parent.className === 'string' ? parent.className : (parent.getAttribute('class') || '');
                    const parentId = parent.id || '';
                    const parentClasses = (parentClass + ' ' + parentId).toLowerCase();

                    // Check if parent container is specifically labeled as an ad wrapper
                    const isExplicitAdParent = /(^|\b|_|-)(ad-wrapper|ad-container|ad-box|advert-wrapper|sponsor-wrapper|placement-wrapper|reklama-box)(\b|_|-|$)/i.test(parentClasses);

                    if (isExplicitAdParent) {
                        const externalContent = parent.querySelector('a:not([data-qb-collapsed]), img:not([data-qb-collapsed]), input, button, video');
                        if (!externalContent) {
                            parent.style.setProperty('display', 'none', 'important');
                            parent.style.setProperty('visibility', 'hidden', 'important');
                            parent.style.setProperty('height', '0px', 'important');
                            parent.style.setProperty('min-height', '0px', 'important');
                            parent.style.setProperty('max-height', '0px', 'important');
                            parent.style.setProperty('margin', '0px', 'important');
                            parent.style.setProperty('padding', '0px', 'important');
                            parent.dataset.qbCollapsed = 'true';
                        }
                    }
                }
            } catch (_) {}
        }

        let collapseScheduled = false;

        function scanAndCollapse() {
            collapseScheduled = false;
            try {
                const matches = document.querySelectorAll(AD_SELECTORS);
                for (let i = 0; i < matches.length; i++) {
                    collapseElement(matches[i]);
                }
            } catch (_) {}
        }

        function scheduleCollapse() {
            if (collapseScheduled) return;
            collapseScheduled = true;
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(scanAndCollapse, { timeout: 150 });
            } else {
                setTimeout(scanAndCollapse, 60);
            }
        }

        // Run immediately if DOM elements exist
        scheduleCollapse();

        // Run on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', scheduleCollapse);
        }

        // Run on window load
        window.addEventListener('load', scheduleCollapse);

        // Run on dynamic DOM mutations (SPAs and infinite scroll feeds)
        const observer = new MutationObserver((mutations) => {
            let hasAddedNodes = false;
            for (let i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
                    hasAddedNodes = true;
                    break;
                }
            }
            if (hasAddedNodes) {
                scheduleCollapse();
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                }
                scheduleCollapse();
            });
        }
    } catch (_) {}
})();
