const { ipcRenderer, contextBridge, webFrame } = require('electron');
 
// Safely wrap sendToHost so preload functions gracefully whether running inside a <webview> or a popup BrowserWindow
const origSendToHost = typeof ipcRenderer.sendToHost === 'function' ? ipcRenderer.sendToHost.bind(ipcRenderer) : null;
ipcRenderer.sendToHost = function(channel, ...args) {
    try {
        if (origSendToHost) origSendToHost(channel, ...args);
    } catch (_) {}
};

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
                window.__qbrowse_passkey_overridden = true;

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
                    navigator.credentials.get.toString = () => origGet.toString();
                    navigator.credentials.create.toString = () => origCreate.toString();
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

function runSmartDark() {
    const { isForceDark, isExcluded } = currentSmartDarkConfig;
    try {
        if (!isForceDark || isExcluded) {
            if (smartDarkObserver) { smartDarkObserver.disconnect(); smartDarkObserver = null; }
            const styleEl = document.getElementById('qbrowse-smart-dark-style');
            if (styleEl) styleEl.remove();
            if (document.documentElement) document.documentElement.classList.remove('qbrowse-smart-dark-active');
            return;
        }

        let styleEl = document.getElementById('qbrowse-smart-dark-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'qbrowse-smart-dark-style';
            styleEl.textContent = `
                @media screen {
                    html.qbrowse-smart-dark-active {
                        filter: invert(0.92) hue-rotate(180deg) !important;
                        background-color: #121214 !important;
                        color-scheme: dark !important;
                    }
                    html.qbrowse-smart-dark-active img,
                    html.qbrowse-smart-dark-active picture,
                    html.qbrowse-smart-dark-active video,
                    html.qbrowse-smart-dark-active canvas,
                    html.qbrowse-smart-dark-active svg {
                        filter: invert(1) hue-rotate(180deg) !important;
                    }
                    html.qbrowse-smart-dark-active #qbrowse-highlight-pill,
                    html.qbrowse-smart-dark-active #qbrowse-note-card,
                    html.qbrowse-smart-dark-active .qbrowse-note-badge,
                    html.qbrowse-smart-dark-active #qbrowse-passkey-popup-modal {
                        filter: invert(1) hue-rotate(180deg) !important;
                    }
                }
                @media print {
                    html.qbrowse-smart-dark-active {
                        filter: none !important;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        color-scheme: light !important;
                    }
                    html.qbrowse-smart-dark-active img,
                    html.qbrowse-smart-dark-active picture,
                    html.qbrowse-smart-dark-active video,
                    html.qbrowse-smart-dark-active canvas,
                    html.qbrowse-smart-dark-active svg {
                        filter: none !important;
                    }
                    html.qbrowse-smart-dark-active #qbrowse-highlight-pill,
                    html.qbrowse-smart-dark-active #qbrowse-note-card,
                    html.qbrowse-smart-dark-active .qbrowse-note-badge,
                    html.qbrowse-smart-dark-active #qbrowse-passkey-popup-modal {
                        filter: none !important;
                    }
                }
            `;
            (document.head || document.documentElement).appendChild(styleEl);
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

        let isNativelyDark = false;
        const docEl = document.documentElement;
        const body = document.body;

        const isOurInjectedBg = (bg) => {
            if (!bg) return false;
            // Injected background #121214 is [18, 18, 20]
            return Math.abs(bg[0] - 18) <= 2 && Math.abs(bg[1] - 18) <= 2 && Math.abs(bg[2] - 20) <= 2;
        };

        if (docEl.getAttribute('data-theme') === 'dark' ||
            docEl.getAttribute('data-color-mode') === 'dark' ||
            docEl.getAttribute('data-bs-theme') === 'dark' ||
            docEl.classList.contains('dark') ||
            docEl.classList.contains('dark-theme') ||
            docEl.classList.contains('theme-dark') ||
            (body && (body.classList.contains('dark') || body.classList.contains('dark-theme') || body.classList.contains('theme-dark')))) {
            isNativelyDark = true;
        } else {
            const containers = [
                body ? window.getComputedStyle(body) : null,
                document.getElementById('root') ? window.getComputedStyle(document.getElementById('root')) : null,
                document.getElementById('app') ? window.getComputedStyle(document.getElementById('app')) : null,
                document.querySelector('main') ? window.getComputedStyle(document.querySelector('main')) : null,
                docEl ? window.getComputedStyle(docEl) : null
            ].filter(Boolean);

            for (const st of containers) {
                const bg = parseRGB(st.backgroundColor);
                if (bg && !isOurInjectedBg(bg)) {
                    if (getLuminance(bg) < 0.35) {
                        isNativelyDark = true;
                    }
                    break;
                }
            }
        }

        if (!isNativelyDark) {
            if (!docEl.classList.contains('qbrowse-smart-dark-active')) {
                docEl.classList.add('qbrowse-smart-dark-active');
            }
        } else {
            if (docEl.classList.contains('qbrowse-smart-dark-active')) {
                docEl.classList.remove('qbrowse-smart-dark-active');
            }
        }

        if (!smartDarkObserver && (body || docEl)) {
            smartDarkObserver = new MutationObserver((mutations) => {
                let hasRelevantChange = false;
                for (const m of mutations) {
                    if (m.type === 'attributes') {
                        // Skip if the only change was our own class
                        if (m.attributeName === 'class' && (m.target === docEl || m.target === body)) {
                            continue;
                        }
                        hasRelevantChange = true;
                        break;
                    } else if (m.type === 'childList') {
                        hasRelevantChange = true;
                        break;
                    }
                }
                if (!hasRelevantChange) return;

                if (smartDarkTimer) clearTimeout(smartDarkTimer);
                smartDarkTimer = setTimeout(runSmartDark, 300);
            });
            smartDarkObserver.observe(body || docEl, {
                childList: true,
                subtree: false,
                attributes: true,
                attributeFilter: ['class', 'style', 'data-theme', 'data-color-mode', 'data-bs-theme']
            });
        }
    } catch (e) {}
}

function checkSmartDark(isForceDark, isExcluded) {
    currentSmartDarkConfig = { isForceDark, isExcluded };
    runSmartDark();
}

window.addEventListener('DOMContentLoaded', runSmartDark);
window.addEventListener('load', runSmartDark);
window.addEventListener('popstate', runSmartDark);

ipcRenderer.on('apply-smart-dark', (event, { isForceDark, isExcluded }) => {
    checkSmartDark(isForceDark, isExcluded);
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

    let activePillEl = null;
    let activeCardEl = null;
    let currentAnnotations = [];
    let lastRightClickSelection = null;

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
                background: rgba(18, 18, 24, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 5px;
                padding: 1px 4px;
                font-size: 11px;
                line-height: 14px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
                user-select: none;
            }
            .qbrowse-note-badge:hover {
                transform: scale(1.18);
                background: rgba(0, 0, 0, 0.95);
                border-color: #d4bc94;
            }
            #qbrowse-highlight-pill {
                position: absolute;
                z-index: 2147483646;
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 5px 8px;
                background: rgba(18, 18, 24, 0.92);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.18);
                border-radius: 9999px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.65), 0 0 1px rgba(255,255,255,0.4);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: #fff;
                user-select: none;
                animation: qbrowsePillPop 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes qbrowsePillPop {
                0% { opacity: 0; transform: scale(0.92) translateY(6px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            .qb-pill-color-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                cursor: pointer;
                border: 1.5px solid rgba(255,255,255,0.3);
                transition: transform 0.15s ease, border-color 0.15s ease;
                flex-shrink: 0;
            }
            .qb-pill-color-dot:hover {
                transform: scale(1.25);
                border-color: #ffffff;
            }
            .qb-pill-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.15);
                color: rgba(255,255,255,0.9);
                border-radius: 9999px;
                padding: 3px 8px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.15s ease, color 0.15s ease;
            }
            .qb-pill-btn:hover {
                background: rgba(255,255,255,0.22);
                color: #fff;
            }
            #qbrowse-note-card {
                position: absolute;
                z-index: 2147483647;
                width: 290px;
                background: rgba(18, 18, 24, 0.94);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                border: 1px solid rgba(255, 255, 255, 0.18);
                border-radius: 14px;
                box-shadow: 0 16px 40px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.3);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: #fff;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                animation: qbrowsePillPop 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            html.qbrowse-smart-dark-active #qbrowse-highlight-pill,
            html.qbrowse-smart-dark-active #qbrowse-note-card,
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

    function removePill() {
        if (activePillEl) {
            activePillEl.remove();
            activePillEl = null;
        }
    }

    function removeCard() {
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
        badge.textContent = '📝';
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

        if (bestIndex === -1) {
            const lowerFull = fullText.toLowerCase();
            const lowerTarget = cleanTarget.toLowerCase();
            bestIndex = lowerFull.indexOf(lowerTarget);
        }

        if (bestIndex === -1) return null;

        const matchEnd = bestIndex + cleanTarget.length;
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

    function openNoteCard(id, anchorEl) {
        removeCard();
        removePill();

        const ann = currentAnnotations.find(a => a.id === id) || { id, note: '', color: 'accent' };
        const rect = anchorEl.getBoundingClientRect();

        const card = document.createElement('div');
        card.id = 'qbrowse-note-card';

        const top = window.scrollY + rect.bottom + 8;
        const left = Math.max(12, Math.min(window.scrollX + rect.left, window.innerWidth - 310));

        card.style.top = `${top}px`;
        card.style.left = `${left}px`;

        setSafeHTML(card, `
            <div style="display: flex; items-center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; tracking: 0.05em; color: rgba(255,255,255,0.5);">Sticky Note</span>
                    <div style="display: flex; align-items: center; gap: 4px; margin-left: 6px;">
                        ${Object.keys(QB_HIGHLIGHT_COLORS).map(key => `
                            <div class="qb-pill-color-dot" data-color="${key}" style="background-color: ${QB_HIGHLIGHT_COLORS[key].dot}; width: 12px; height: 12px; ${ann.color === key ? 'border-color: #fff; transform: scale(1.2);' : ''}"></div>
                        `).join('')}
                    </div>
                </div>
                <button id="qb-card-close" style="background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 14px; line-height: 1;">✕</button>
            </div>
            <textarea id="qb-card-textarea" placeholder="Type your note, thought, or takeaway..." style="width: 100%; height: 85px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #fff; font-size: 12px; font-family: inherit; padding: 8px; resize: none; outline: none; box-sizing: border-box;"></textarea>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px;">
                <button id="qb-card-delete" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer;">Delete</button>
                <button id="qb-card-save" style="background: var(--accent, #d4bc94); border: none; color: #000; border-radius: 6px; padding: 4px 12px; font-size: 11px; font-weight: 700; cursor: pointer;">Save</button>
            </div>
        `);

        document.body.appendChild(card);
        activeCardEl = card;

        const textarea = card.querySelector('#qb-card-textarea');
        textarea.value = ann.note || '';
        textarea.focus();

        // Handle color dot clicks
        card.querySelectorAll('.qb-pill-color-dot').forEach(dot => {
            dot.onclick = (e) => {
                e.stopPropagation();
                const newColor = dot.getAttribute('data-color');
                ann.color = newColor;
                
                // Update marks in DOM
                const colorConfig = QB_HIGHLIGHT_COLORS[newColor] || QB_HIGHLIGHT_COLORS.accent;
                document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`).forEach(m => {
                    m.setAttribute('data-color', newColor);
                    m.style.backgroundColor = colorConfig.bg;
                    m.style.borderBottomColor = colorConfig.border;
                });

                ipcRenderer.sendToHost('qbrowse-annotation-update', { id, color: newColor });

                // Highlight active dot
                card.querySelectorAll('.qb-pill-color-dot').forEach(d => {
                    d.style.borderColor = 'rgba(255,255,255,0.3)';
                    d.style.transform = 'scale(1)';
                });
                dot.style.borderColor = '#ffffff';
                dot.style.transform = 'scale(1.2)';
            };
        });

        // Close button
        card.querySelector('#qb-card-close').onclick = () => removeCard();

        // Save button
        card.querySelector('#qb-card-save').onclick = () => {
            const noteVal = textarea.value.trim();
            ann.note = noteVal;

            const targetMarks = document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`);
            if (targetMarks.length > 0) {
                if (noteVal) {
                    attachNoteBadge(targetMarks[targetMarks.length - 1], id);
                } else {
                    const existingBadge = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
                    if (existingBadge) existingBadge.remove();
                }
            }

            ipcRenderer.sendToHost('qbrowse-annotation-update', { id, note: noteVal, color: ann.color || 'accent' });
            removeCard();
        };

        // Delete button
        card.querySelector('#qb-card-delete').onclick = () => {
            document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`).forEach(m => {
                const parent = m.parentNode;
                while (m.firstChild) parent.insertBefore(m.firstChild, m);
                m.remove();
            });
            const badge = document.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
            if (badge) badge.remove();

            currentAnnotations = currentAnnotations.filter(a => a.id !== id);
            ipcRenderer.sendToHost('qbrowse-annotation-delete', id);
            removeCard();
        };

        // Click outside dismisses card
        const handleOutsideClick = (e) => {
            if (activeCardEl && !activeCardEl.contains(e.target) && !anchorEl.contains(e.target)) {
                // Auto-save note on blur/outside click
                const noteVal = textarea.value.trim();
                if (noteVal !== (ann.note || '')) {
                    ann.note = noteVal;
                    ipcRenderer.sendToHost('qbrowse-annotation-update', { id, note: noteVal, color: ann.color || 'accent' });
                    const targetMarks = document.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${id}"]`);
                    if (targetMarks.length > 0) {
                        if (noteVal) attachNoteBadge(targetMarks[targetMarks.length - 1], id);
                    }
                }
                removeCard();
                document.removeEventListener('mousedown', handleOutsideClick);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', handleOutsideClick), 10);
    }

    function showPill(range, rect, text) {
        removePill();

        const pill = document.createElement('div');
        pill.id = 'qbrowse-highlight-pill';

        let top = window.scrollY + rect.top - 44;
        if (rect.top < 52) {
            top = window.scrollY + rect.bottom + 8;
        }
        const left = Math.max(12, Math.min(window.scrollX + rect.left + (rect.width / 2) - 110, window.innerWidth - 240));

        pill.style.top = `${top}px`;
        pill.style.left = `${left}px`;

        setSafeHTML(pill, `
            <div style="display: flex; align-items: center; gap: 4px;">
                ${Object.keys(QB_HIGHLIGHT_COLORS).map(key => `
                    <div class="qb-pill-color-dot" data-color="${key}" title="Highlight with ${QB_HIGHLIGHT_COLORS[key].label}" style="background-color: ${QB_HIGHLIGHT_COLORS[key].dot};"></div>
                `).join('')}
            </div>
            <div style="width: 1px; height: 14px; background: rgba(255,255,255,0.2); margin: 0 2px;"></div>
            <button class="qb-pill-btn" id="qb-pill-add-note" title="Add Note">📝 Note</button>
            <button class="qb-pill-btn" id="qb-pill-copy" title="Copy selection">📋</button>
        `);

        document.body.appendChild(pill);
        activePillEl = pill;

        // Color dot click
        pill.querySelectorAll('.qb-pill-color-dot').forEach(dot => {
            dot.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const color = dot.getAttribute('data-color');
                createHighlightFromRange(range, color);
                removePill();
            };
        });

        // Add note button
        pill.querySelector('#qb-pill-add-note').onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const res = createHighlightFromRange(range, 'accent');
            removePill();
            if (res && res.marks.length > 0) {
                openNoteCard(res.id, res.marks[res.marks.length - 1]);
            }
        };

        // Copy button
        pill.querySelector('#qb-pill-copy').onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                navigator.clipboard.writeText(text);
                const copyBtn = pill.querySelector('#qb-pill-copy');
                if (copyBtn) copyBtn.textContent = '✓';
                setTimeout(removePill, 600);
            } catch (_) {
                removePill();
            }
        };
    }

    function handleSelectionCheck() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            removePill();
            return;
        }

        const text = sel.toString().trim();
        if (text.length < 2) {
            removePill();
            return;
        }

        const anchor = sel.anchorNode;
        const focus = sel.focusNode;
        const anchorEl = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
        const focusEl = focus?.nodeType === 1 ? focus : focus?.parentElement;
        if (anchorEl?.closest('input, textarea, [contenteditable="true"]') ||
            focusEl?.closest('input, textarea, [contenteditable="true"]')) {
            removePill();
            return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            removePill();
            return;
        }

        // Store for right-click context menu bridge
        lastRightClickSelection = {
            range: range.cloneRange(),
            text,
            prefix: extractPrefixAndSuffix(range).prefix,
            suffix: extractPrefixAndSuffix(range).suffix
        };

        showPill(range, rect, text);
    }

    window.addEventListener('mouseup', (e) => {
        if (activePillEl && activePillEl.contains(e.target)) return;
        if (activeCardEl && activeCardEl.contains(e.target)) return;
        setTimeout(handleSelectionCheck, 20);
    });

    window.addEventListener('keyup', (e) => {
        if (['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            setTimeout(handleSelectionCheck, 20);
        }
    });

    window.addEventListener('mousedown', (e) => {
        if (activePillEl && !activePillEl.contains(e.target)) {
            removePill();
        }
    });

    // Right-click context menu tracking
    window.addEventListener('contextmenu', (e) => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length >= 1) {
            const text = sel.toString().trim();
            const range = sel.getRangeAt(0);
            const { prefix, suffix } = extractPrefixAndSuffix(range);
            lastRightClickSelection = {
                range: range.cloneRange(),
                text,
                prefix,
                suffix
            };
            ipcRenderer.sendToHost('qbrowse-selection-contextmenu', {
                hasSelection: true,
                text: text.slice(0, 120)
            });
        } else {
            lastRightClickSelection = null;
            ipcRenderer.sendToHost('qbrowse-selection-contextmenu', {
                hasSelection: false
            });
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
    ipcRenderer.on('qbrowse-scroll-to-annotation', (event, id) => {
        const el = document.querySelector(`.qbrowse-highlight[data-qbrowse-id="${id}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('qbrowse-highlight-pulse');
            setTimeout(() => el.classList.remove('qbrowse-highlight-pulse'), 1800);
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
