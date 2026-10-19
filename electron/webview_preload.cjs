const { ipcRenderer, contextBridge, webFrame } = require('electron');
 
// Safely wrap sendToHost so preload functions gracefully whether running inside a <webview> or a popup BrowserWindow
const origSendToHost = typeof ipcRenderer.sendToHost === 'function' ? ipcRenderer.sendToHost.bind(ipcRenderer) : null;
ipcRenderer.sendToHost = function(channel, ...args) {
    try {
        if (origSendToHost) origSendToHost(channel, ...args);
    } catch (_) {}
};

const isOAuthPopup = Array.isArray(process.argv) && process.argv.includes('--is-oauth-popup');

function isGoogleAuthTarget(urlOrHost) {
    if (!urlOrHost) return false;
    try {
        const str = String(urlOrHost).toLowerCase();
        let hostname = str;
        if (str.includes('://')) {
            hostname = new URL(str).hostname.toLowerCase();
        }
        return hostname.startsWith('accounts.google.') ||
               hostname === 'oauth2.googleapis.com' ||
               hostname.startsWith('accounts.youtube.') ||
               hostname === 'myaccount.google.com' ||
               hostname.startsWith('consent.google.') ||
               hostname.startsWith('consent.youtube.') ||
               (hostname.includes('google.') && (str.includes('/signin') || str.includes('/servicelogin'))) ||
               (hostname === 'apis.google.com' && (str.includes('/auth') || str.includes('/oauth')));
    } catch (_) {
        const s = String(urlOrHost).toLowerCase();
        return s.includes('accounts.google.') || s.includes('oauth2.googleapis.com') || s.includes('consent.google.');
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

                if (!window.chrome.runtime) {
                    window.chrome.runtime = {
                        OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
                        OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
                        PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
                        PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
                        PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
                        RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
                        connect: function connect() { throw new TypeError('Error in invocation of runtime.connect'); },
                        sendMessage: function sendMessage() { throw new TypeError('Error in invocation of runtime.sendMessage'); }
                    };
                }
            } catch (_) {}
        })();
    `;
    if (typeof webFrame !== 'undefined' && webFrame.executeJavaScript) {
        webFrame.executeJavaScript(stealthChromeScript).catch(() => {});
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', () => {
            try {
                if (typeof webFrame !== 'undefined' && webFrame.executeJavaScript) {
                    webFrame.executeJavaScript(stealthChromeScript).catch(() => {});
                }
            } catch (_) {}
        }, { once: true });
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
                        xhr.open('POST', 'http://127.0.0.1:${dialogPort}/dialog', false);
                        // Using text/plain ensures this is a simple CORS request with no preflight OPTIONS needed
                        xhr.setRequestHeader('Content-Type', 'text/plain');
                        xhr.setRequestHeader('X-QBrowse-Dialog-Token', '${dialogToken}');

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
                setInterval(scanIframes, 100);

                // Also scan on user interactions so dynamically written iframes (like W3Schools Tryit Editor)
                // are guaranteed to have their window.prompt/alert/confirm patched right when clicked
                window.addEventListener('click', scanIframes, true);
                window.addEventListener('pointerdown', scanIframes, true);
                window.addEventListener('focus', scanIframes, true);
                window.addEventListener('DOMContentLoaded', scanIframes);
                window.addEventListener('load', scanIframes);
            })();
        `;

        if (typeof webFrame !== 'undefined' && webFrame.executeJavaScript) {
            webFrame.executeJavaScript(dialogBridgeScript).catch(() => {});
        }
        window.addEventListener('DOMContentLoaded', () => {
            try {
                if (typeof webFrame !== 'undefined' && webFrame.executeJavaScript) {
                    webFrame.executeJavaScript(dialogBridgeScript).catch(() => {});
                }
            } catch (_) {}
        }, { once: true });
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

// Listen to Ctrl/Cmd + Wheel inside webview for responsive zoom (10% increments)
let zoomWheelAccumulator = 0;
let zoomWheelResetTimer = null;
let lastWebviewZoomTime = 0;

function handleCtrlWheelZoom(e) {
    if (e.ctrlKey || e.metaKey) {
        if (e.__qbrowseZoomHandled) return;
        e.__qbrowseZoomHandled = true;

        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
        }

        clearTimeout(zoomWheelResetTimer);
        zoomWheelResetTimer = setTimeout(() => {
            zoomWheelAccumulator = 0;
        }, 180);

        // Normalize delta across input modes (lines, pages, pixels)
        let normalizedDelta = e.deltaY;
        if (e.deltaMode === 1) {
            normalizedDelta *= 33;
        } else if (e.deltaMode === 2) {
            normalizedDelta *= 100;
        }

        zoomWheelAccumulator += normalizedDelta;
        const threshold = 30; // Responsive threshold for mouse wheel notches and pinch gestures
        if (Math.abs(zoomWheelAccumulator) >= threshold) {
            const now = performance.now();
            if (now - lastWebviewZoomTime >= 40) {
                const delta = zoomWheelAccumulator < 0 ? 10 : -10;
                zoomWheelAccumulator = 0;
                lastWebviewZoomTime = now;
                ipcRenderer.sendToHost('webview-zoom-wheel', delta);
            }
        }
    }
}

window.addEventListener('wheel', handleCtrlWheelZoom, { passive: false, capture: true });
document.addEventListener('wheel', handleCtrlWheelZoom, { passive: false, capture: true });


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
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkReaderStatus, 150);
        setTimeout(checkReaderStatus, 600);
        setTimeout(checkReaderStatus, 1500);
    });
    window.addEventListener('load', () => {
        setTimeout(checkReaderStatus, 100);
        setTimeout(checkReaderStatus, 1000);
    });

    try {
        const origPushState = history.pushState;
        history.pushState = function() {
            const ret = origPushState.apply(this, arguments);
            setTimeout(checkReaderStatus, 250);
            setTimeout(checkReaderStatus, 1200);
            return ret;
        };
        const origReplaceState = history.replaceState;
        history.replaceState = function() {
            const ret = origReplaceState.apply(this, arguments);
            setTimeout(checkReaderStatus, 250);
            setTimeout(checkReaderStatus, 1200);
            return ret;
        };
        window.addEventListener('popstate', () => {
            setTimeout(checkReaderStatus, 250);
            setTimeout(checkReaderStatus, 1200);
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
                const hostname = window.location.hostname;
                const matches = await ipcRenderer.invoke('vault-get-matching', {
                    hostname,
                    rpId: data?.rpId || '',
                    allowCredentials: data?.allowCredentials || []
                });
                const passkeys = (matches || []).filter(m => m.itemType === 'passkey' || (m.passkeyData && (m.passkeyData.credentialId || m.passkeyData.rpId)));
                if (passkeys.length > 0) {
                    if (data?.conditional) {
                        // Silent on conditional mediation (autofill probe on page load)
                        return null;
                    }
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

                    console.log("[QVault WebAuthn] User verified! Using QVault passkey for", hostname, chosen);
                    const hex = chosen.passkeyData?.credentialId || '0123456789abcdef0123456789abcdef';
                    ipcRenderer.sendToHost('webauthn-used', { hostname, username: chosen.username || '' });
                    return {
                        credIdHex: hex,
                        username: chosen.username || '',
                        privateKey: chosen.passkeyData?.privateKey || null,
                        rpId: chosen.passkeyData?.rpId || data?.rpId || hostname
                    };
                } else if (!data?.conditional) {
                    ipcRenderer.sendToHost('webauthn-no-passkey', { hostname });
                }
            } catch (err) {
                console.warn("[QVault WebAuthn] Bridge get error:", err);
            }
            return null;
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
                    try {
                        if (options && options.publicKey && window.__qbrowse_passkey_bridge) {
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
                    } catch(e) {
                        console.warn("[QVault Passkey] create error:", e);
                        throw e;
                    }
                    return await origCreate(options);
                };

                navigator.credentials.get = async function(options) {
                    try {
                        if (options && options.publicKey && window.__qbrowse_passkey_bridge) {
                            const isConditional = options.publicKey.mediation === 'conditional' || options.mediation === 'conditional';
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
                            console.log("[QVault Passkey] Intercepted credentials.get in Main World! rpId:", rpIdFromOptions, "allowCreds:", allowCredIds, "Conditional:", isConditional);
                            const res = await window.__qbrowse_passkey_bridge.get({
                                conditional: isConditional,
                                rpId: rpIdFromOptions,
                                allowCredentials: allowCredIds
                            });
                            if (res && res.denied) {
                                throw new DOMException("The user cancelled the passkey verification prompt.", "NotAllowedError");
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
                            if (isConditional) {
                                return new Promise((resolve, reject) => {
                                    if (options && options.signal) {
                                        if (options.signal.aborted) {
                                            return reject(new DOMException("The operation was aborted.", "AbortError"));
                                        }
                                        options.signal.addEventListener('abort', () => {
                                            reject(new DOMException("The operation was aborted.", "AbortError"));
                                        }, { once: true });
                                    }
                                });
                            }
                            return await origGet(options);
                        }
                    } catch(e) {
                        console.warn("[QVault Passkey] get error:", e);
                        throw e;
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

            if (!title) {
                const ytTitle = document.querySelector('h1.ytd-watch-metadata, yt-formatted-string.ytd-video-primary-info-renderer, div[data-testid="now-playing-widget"]');
                if (ytTitle) {
                    title = ytTitle.textContent.trim();
                } else if (document.title) {
                    title = document.title.replace(/^\([0-9]+\)\s*/, '').replace(/ - YouTube$/, '').replace(/ - Spotify$/, '').replace(/ \| TIDAL$/, '');
                }
            }

            if (!artist) {
                const ytChannel = document.querySelector('#owner #channel-name, #upload-info #channel-name, a[data-testid="context-item-author"]');
                if (ytChannel) artist = ytChannel.textContent.trim();
                else artist = window.location.hostname;
            }

            if (!albumArt) {
                const ogImage = document.querySelector('meta[property="og:image"]');
                if (ogImage) albumArt = ogImage.content;
                else {
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

setInterval(sendMediaState, 800);

document.addEventListener('play', sendMediaState, true);
document.addEventListener('pause', sendMediaState, true);

ipcRenderer.on('media-control-command', (event, cmdData) => {
    try {
        const cmd = typeof cmdData === 'string' ? cmdData : (cmdData ? cmdData.action : '');
        console.log('[Preload MediaControl] 📩 Received IPC command in page:', cmd, cmdData);

        const mediaEls = Array.from(document.querySelectorAll('video, audio'));
        console.log(`[Preload MediaControl] Found ${mediaEls.length} media element(s) in document`);
        const activeMedia = mediaEls.find(el => !el.paused) || mediaEls[0];

        if (cmd === 'toggle-play') {
            if (activeMedia) {
                if (activeMedia.paused) activeMedia.play();
                else activeMedia.pause();
            } else {
                const playBtn = document.querySelector('.ytp-play-button, button[data-testid="control-button-playpause"], .play-button');
                if (playBtn) playBtn.click();
            }
        } else if (cmd === 'next-track') {
            const nextBtn = document.querySelector('.ytp-next-button, button[data-testid="control-button-skip-forward"]');
            if (nextBtn) nextBtn.click();
            else if (activeMedia && activeMedia.duration) {
                activeMedia.currentTime = Math.min(activeMedia.duration, activeMedia.currentTime + 10);
            }
        } else if (cmd === 'prev-track') {
            const prevBtn = document.querySelector('.ytp-prev-button, button[data-testid="control-button-skip-back"]');
            if (prevBtn) prevBtn.click();
            else if (activeMedia) {
                activeMedia.currentTime = Math.max(0, activeMedia.currentTime - 10);
            }
        } else if (cmd === 'seek') {
            if (activeMedia && typeof cmdData.time === 'number') {
                activeMedia.currentTime = cmdData.time;
            }
        } else if (cmd === 'mute-toggle') {
            mediaEls.forEach(el => el.muted = !el.muted);
        } else if (cmd === 'toggle-pip' || cmd === 'pip') {
            console.log('[Preload MediaControl] 📺 Executing toggle-pip action');
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
                                console.log('[Preload MediaControl] 🎉 Native OS Picture-in-Picture window opened successfully!', pipWin);
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
// --- AGGRESSIVE AD-SKIPPER ---
if (window.location.hostname.includes('youtube.com') && window === window.top) {
    setInterval(() => {
        try {
            if (!document.body) return;
            const ad = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-player-overlay-instream-info');
            
            if (ad) {
                const video = document.querySelector('video');
                if (video) {
                    // Mute ad instantly
                    video.muted = true;
                    // If the current video buffer is an ad (duration less than 5 mins), jump to the end instantly
                    if (!isNaN(video.duration) && video.duration > 0 && video.duration < 300) {
                        if (video.currentTime < video.duration - 0.5) {
                            video.currentTime = video.duration - 0.1;
                        }
                    }
                }
                
                // Click any available skip button
                const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot');
                if (skipBtn) {
                    skipBtn.click();
                }
            }
        } catch(e) {}
    }, 50);
}
// --- SMART DARK MODE ---
let smartDarkObserver = null;
let currentSmartDarkConfig = { isForceDark: false, isExcluded: false };
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

        if (!isForceDark || isExcluded) {
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
                    html.qbrowse-smart-dark-active #qbrowse-oauth-find-bar {
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
                    html.qbrowse-smart-dark-active #qbrowse-oauth-find-bar {
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

    // 2. Dyslexia-Friendly Font (OpenDyslexic with sans-serif fallback)
    if (currentA11yConfig.a11yDyslexiaFont) {
        css += `
            @font-face {
                font-family: 'OpenDyslexic';
                src: url('https://cdn.jsdelivr.net/npm/opendyslexic@1.0.3/dist/opentype/OpenDyslexic-Regular.otf') format('opentype');
                font-weight: normal;
                font-style: normal;
                font-display: swap;
            }
            body, p, span, a, li, input, textarea, select, button, div, h1, h2, h3, h4, h5, h6 {
                font-family: 'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                letter-spacing: 0.02em !important;
                line-height: 1.6 !important;
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

    // 4. Force Reduced Motion (Strict WCAG 2.2.2 / 2.3.3)
    if (currentA11yConfig.a11yReducedMotion) {
        css += `
            *, *::before, *::after {
                animation-duration: 0.001ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.001ms !important;
                scroll-behavior: auto !important;
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
            html.qbrowse-smart-dark-active #qbrowse-passkey-popup-modal {
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
        const text = range.toString().trim();
        if (!text) return null;

        const { prefix, suffix } = extractPrefixAndSuffix(range);
        const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const marks = wrapRangeWithHighlight(range, id, colorKey, initialNote);
        if (marks.length === 0) return null;

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

        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }

        return { id, marks, annotation };
    }

    let activeAnchorId = null;

    function openNoteCard(id, anchorEl) {
        removeCard();
        ipcRenderer.sendToHost('qbrowse-hide-selection-pill');

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
        ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
        if (activeAnchorId) {
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
        }
    }, { passive: true });

    window.addEventListener('mousedown', (e) => {
        const isBadge = e.target && e.target.closest && e.target.closest('.qbrowse-note-badge');
        if (activeAnchorId && !isBadge) {
            ipcRenderer.sendToHost('qbrowse-close-note-card');
            activeAnchorId = null;
        }
        if (!isBadge) {
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
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
            if (targetMarks.length > 0) {
                if (note) {
                    attachNoteBadge(targetMarks[targetMarks.length - 1], id);
                } else {
                    const existingBadge = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
                    if (existingBadge) existingBadge.remove();
                }
            }
        }
    });

    ipcRenderer.on('qbrowse-annotation-delete', (event, id) => {
        document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`).forEach(m => {
            const parent = m.parentNode;
            while (m.firstChild) parent.insertBefore(m.firstChild, m);
            m.remove();
        });
        const badge = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
        if (badge) badge.remove();

        currentAnnotations = currentAnnotations.filter(a => a.id !== id);
        if (activeAnchorId === id) activeAnchorId = null;
    });

    ipcRenderer.on('qbrowse-close-note-card', () => {
        activeAnchorId = null;
    });

    function handleSelectionCheck() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            currentSelectionState = null;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            return;
        }

        const text = sel.toString().trim();
        if (text.length < 2) {
            currentSelectionState = null;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            return;
        }

        const anchor = sel.anchorNode;
        const focus = sel.focusNode;
        const anchorEl = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
        const focusEl = focus?.nodeType === 1 ? focus : focus?.parentElement;
        if (anchorEl?.closest('input, textarea, [contenteditable="true"]') ||
            focusEl?.closest('input, textarea, [contenteditable="true"]')) {
            currentSelectionState = null;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
            return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            currentSelectionState = null;
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
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
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
        }
    }, true);

    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
        }
    });

    window.addEventListener('scroll', () => {
        ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
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
        ipcRenderer.sendToHost('qbrowse-hide-selection-pill');
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
        const targetRange = currentSelectionState?.range || lastRightClickSelection?.range || (window.getSelection()?.rangeCount > 0 ? window.getSelection().getRangeAt(0) : null);
        if (targetRange) {
            createHighlightFromRange(targetRange, color);
            currentSelectionState = null;
            try { window.getSelection().removeAllRanges(); } catch (_) {}
        }
    });

    // IPC: Add note triggered from host floating pill
    ipcRenderer.on('qbrowse-pill-add-note', () => {
        const targetRange = currentSelectionState?.range || lastRightClickSelection?.range || (window.getSelection()?.rangeCount > 0 ? window.getSelection().getRangeAt(0) : null);
        if (targetRange) {
            const res = createHighlightFromRange(targetRange, 'accent');
            currentSelectionState = null;
            try { window.getSelection().removeAllRanges(); } catch (_) {}
            if (res && res.marks.length > 0) {
                openNoteCard(res.id, res.marks[res.marks.length - 1]);
            }
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
                if (ann.note) {
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
            lastRightClickSelection = null;
        }
    });

    ipcRenderer.on('qbrowse-context-add-note', () => {
        if (lastRightClickSelection && lastRightClickSelection.range) {
            const res = createHighlightFromRange(lastRightClickSelection.range, 'accent');
            lastRightClickSelection = null;
            if (res && res.marks.length > 0) {
                openNoteCard(res.id, res.marks[res.marks.length - 1]);
            }
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
            const proto = Object.getPrototypeOf(el);
            const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
            if (descriptor && descriptor.set) {
                descriptor.set.call(el, val);
            } else {
                el.value = val;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
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

    function findAssociatedFields(targetField) {
        let passwordField = null;
        let usernameField = null;

        const form = targetField.form || targetField.closest('form');
        if (form) {
            passwordField = form.querySelector('input[type="password"]');
            
            // Look for username/email candidates in form
            const candidates = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])'));
            usernameField = candidates.find(c => {
                const auto = (c.getAttribute('autocomplete') || '').toLowerCase();
                const name = (c.name || '').toLowerCase();
                const id = (c.id || '').toLowerCase();
                const type = (c.type || '').toLowerCase();
                return auto.includes('username') || auto.includes('email') ||
                       type === 'email' ||
                       name.includes('user') || name.includes('login') || name.includes('email') ||
                       id.includes('user') || id.includes('login') || id.includes('email');
            }) || candidates[0] || null;
        } else {
            // No wrapping form: search DOM context
            if (targetField.type === 'password') {
                passwordField = targetField;
                const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])'));
                const passIdx = allInputs.indexOf(targetField);
                for (let i = passIdx - 1; i >= 0; i--) {
                    const inp = allInputs[i];
                    if (inp.type !== 'password' && inp.type !== 'checkbox' && inp.type !== 'radio') {
                        usernameField = inp;
                        break;
                    }
                }
            } else {
                usernameField = targetField;
                passwordField = document.querySelector('input[type="password"]');
            }
        }

        return { passwordField, usernameField };
    }

    function fillAccountCredentials(cred, sourceInput) {
        if (!cred) return;
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

    function showAutofillDropdown(btnEl, targetInput, matches) {
        closeAutofillDropdown();
        if (!matches || matches.length === 0) return;

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
        dropdown.style.background = 'rgba(20, 20, 24, 0.96)';
        dropdown.style.backdropFilter = 'blur(20px)';
        dropdown.style.webkitBackdropFilter = 'blur(20px)';
        dropdown.style.border = '1px solid rgba(212, 188, 148, 0.25)';
        dropdown.style.borderRadius = '12px';
        dropdown.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.05)';
        dropdown.style.padding = '6px';
        dropdown.style.color = '#ffffff';
        dropdown.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        dropdown.style.fontSize = '12px';
        dropdown.style.userSelect = 'none';

        // Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '6px';
        header.style.padding = '6px 8px 6px';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
        header.style.marginBottom = '4px';
        header.style.color = '#d4bc94';
        header.style.fontWeight = '600';
        header.style.fontSize = '11px';
        header.style.letterSpacing = '0.02em';
        header.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="7.5" cy="15.5" r="5.5"></circle>
                <path d="m21 2-9.6 9.6"></path>
                <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
            </svg>
            <span>QVault Suggestions (${matches.length})</span>
        `;
        dropdown.appendChild(header);

        // Account Items
        matches.forEach(item => {
            const row = document.createElement('div');
            row.style.padding = '8px 10px';
            row.style.borderRadius = '8px';
            row.style.cursor = 'pointer';
            row.style.transition = 'background-color 0.15s ease';
            row.style.display = 'flex';
            row.style.flexDirection = 'column';
            row.style.gap = '2px';

            const userText = item.username || item.title || 'Saved Account';
            row.innerHTML = `
                <div style="font-weight: 500; color: rgba(255, 255, 255, 0.95); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(userText)}</div>
                <div style="font-size: 10px; font-family: monospace; color: rgba(212, 188, 148, 0.7); letter-spacing: 0.1em;">••••••••</div>
            `;

            row.onmouseenter = () => { row.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; };
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
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.tabIndex = -1;
        btn.className = 'qvault-inline-key-btn';
        btn.title = 'Autofill with QVault';
        btn.style.position = 'fixed';
        btn.style.zIndex = '2147483640';
        btn.style.width = '22px';
        btn.style.height = '22px';
        btn.style.borderRadius = '6px';
        btn.style.border = '1px solid rgba(212, 188, 148, 0.4)';
        btn.style.background = 'rgba(18, 18, 22, 0.85)';
        btn.style.color = '#d4bc94';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.cursor = 'pointer';
        btn.style.padding = '0';
        btn.style.margin = '0';
        btn.style.outline = 'none';
        btn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.35)';
        btn.style.transition = 'transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease';

        btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <circle cx="7.5" cy="15.5" r="5.5"></circle>
                <path d="m21 2-9.6 9.6"></path>
                <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
            </svg>
        `;

        btn.onmouseenter = () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.background = 'rgba(212, 188, 148, 0.2)';
            btn.style.borderColor = '#d4bc94';
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'scale(1)';
            btn.style.background = 'rgba(18, 18, 22, 0.85)';
            btn.style.borderColor = 'rgba(212, 188, 148, 0.4)';
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

    function updateBadgePositions() {
        if (qvaultMatches.length === 0) {
            cleanUpBadges();
            return;
        }

        // Discover candidate fields
        const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
        const relevantInputs = new Set(passwordInputs);

        // Also add associated username inputs
        passwordInputs.forEach(pass => {
            const { usernameField } = findAssociatedFields(pass);
            if (usernameField) relevantInputs.add(usernameField);
        });

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

        const password = (passwordField?.value || '').trim();
        if (!password) return; // Must have entered a password to prompt save

        const username = (usernameField?.value || '').trim();
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

    // 2. Enter keydown on password fields
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const target = e.target;
            if (target && target.tagName === 'INPUT' && target.type === 'password') {
                setTimeout(() => captureAndSubmitCredentials(target), 50);
            }
        }
    }, true);

    // 3. Submit button clicks
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, input[type="submit"], [role="button"], a');
        if (!btn) return;

        const type = (btn.getAttribute('type') || '').toLowerCase();
        const text = (btn.innerText || btn.value || '').toLowerCase();
        const isSubmitType = type === 'submit';
        const isLoginText = text.includes('log in') || text.includes('login') ||
                            text.includes('sign in') || text.includes('signin') ||
                            text.includes('submit') || text.includes('continue') || text.includes('next');

        if (isSubmitType || isLoginText) {
            setTimeout(() => captureAndSubmitCredentials(btn), 50);
        }
    }, true);

    // Listen for matching credentials from host
    ipcRenderer.on('qvault-matching-credentials', (event, matches) => {
        qvaultMatches = Array.isArray(matches) ? matches : [];
        updateBadgePositions();
    });

    // Window scroll and resize listeners for badge repositioning
    window.addEventListener('scroll', updateBadgePositions, { passive: true, capture: true });
    window.addEventListener('resize', updateBadgePositions, { passive: true });

    // Mutation observer to detect newly rendered login inputs
    const observer = new MutationObserver(() => {
        if (qvaultMatches.length > 0) {
            updateBadgePositions();
        }
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
            if (qvaultMatches.length > 0) updateBadgePositions();
        });
    }
})();

// ==========================================
// 1. Frameless OAuth / Auth Popup Header & Controls
// ==========================================
(function() {
    const isOAuthPopup = Array.isArray(process.argv) && process.argv.includes('--is-oauth-popup');
    if (!isOAuthPopup) return;

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
        }

        return svg;
    }

    function injectOAuthControls() {
        if (document.getElementById('qbrowse-oauth-header')) return;

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

        navPill.appendChild(backBtn);
        navPill.appendChild(navDivider);
        navPill.appendChild(fwdBtn);
        leftSection.appendChild(navPill);

        // --- 2. Center: Sleek Content-Sized Domain Pill [ 🔒 domain.com ] ---
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

        // --- 3. Right: Single Sleek Close 'X' Button ---
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

        rightSection.appendChild(closeBtn);

        // Assemble TopBar (Left: Nav Pill, Center: Centered Domain Pill, Right: Close Button)
        header.appendChild(leftSection);
        header.appendChild(centerSection);
        header.appendChild(rightSection);

        document.documentElement.appendChild(header);

        // Zoom & Find In Page engines
        const applyZoom = (newFactor) => {
            try {
                const clamped = Math.min(3.0, Math.max(0.5, Math.round(newFactor * 10) / 10));
                webFrame.setZoomFactor(clamped);
            } catch (_) {}
        };

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

                backBtn.style.color = 'rgba(24, 24, 27, 0.75)';
                fwdBtn.style.color = 'rgba(24, 24, 27, 0.75)';

                domainPill.style.background = 'rgba(0, 0, 0, 0.04)';
                domainPill.style.border = '1px solid rgba(0, 0, 0, 0.06)';
                lockIcon.style.color = '#059669';
                hostSpan.style.color = '#18181b';

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

                backBtn.style.color = 'rgba(255, 255, 255, 0.82)';
                fwdBtn.style.color = 'rgba(255, 255, 255, 0.82)';

                domainPill.style.background = 'rgba(255, 255, 255, 0.06)';
                domainPill.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                lockIcon.style.color = '#34d399';
                hostSpan.style.color = 'rgba(255, 255, 255, 0.92)';

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
                applyZoom(webFrame.getZoomFactor() + 0.1);
                return;
            }

            // Zoom Out (Ctrl+-)
            if (e.ctrlKey && (e.key === '-' || e.key === 'Subtract')) {
                e.preventDefault();
                applyZoom(webFrame.getZoomFactor() - 0.1);
                return;
            }

            // Zoom Reset (Ctrl+0)
            if (e.ctrlKey && (e.key === '0' || e.key === 'num0')) {
                e.preventDefault();
                applyZoom(1.0);
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
                const step = e.deltaY < 0 ? 0.05 : -0.05;
                applyZoom(webFrame.getZoomFactor() + step);
            }
        }, { passive: false });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectOAuthControls);
    } else {
        injectOAuthControls();
    }
})();

