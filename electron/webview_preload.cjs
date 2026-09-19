const { ipcRenderer, contextBridge, webFrame } = require('electron');

// Webdriver is natively suppressed by disable-blink-features=AutomationControlled in main.cjs

// --- FIREFOX SPOOFING (MAIN WORLD INJECTION) ---
const injectFirefoxSpoof = () => {
    try {
        const code = `
            (function() {
                // Firefox does not have navigator.userAgentData, and its vendor is an empty string.
                // Google BotGuard actively checks these to detect Chromium browsers spoofing as Firefox.
                if (navigator.userAgentData !== undefined) {
                    try { Object.defineProperty(navigator, 'userAgentData', { get: () => undefined }); } catch(e) {}
                }
                if (navigator.vendor !== '') {
                    try { Object.defineProperty(navigator, 'vendor', { get: () => '' }); } catch(e) {}
                }
            })();
        `;
        if (typeof webFrame !== 'undefined' && webFrame.executeJavaScript) {
            webFrame.executeJavaScript(code).catch(() => {});
        }
    } catch(err) {}
};
injectFirefoxSpoof();
if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', injectFirefoxSpoof);
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

// Listen to Ctrl + Wheel inside webview for pinch-to-zoom / smooth zoom gestures
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        ipcRenderer.sendToHost('webview-zoom-wheel', delta);
    }
}, { passive: false });

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

// QVault On-Demand Autofill (Safe & Non-intrusive: Never auto-injects into DOM)
function fillCredentials(match) {
    if (!match) return;
    const userInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"]');
    const passInputs = document.querySelectorAll('input[type="password"], input[name*="pass"]');

    if (userInputs.length > 0 && match.username) {
        userInputs[0].value = match.username;
        userInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        userInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (passInputs.length > 0 && match.password) {
        passInputs[0].value = match.password;
        passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        passInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
}

ipcRenderer.on('qvault-fill-credentials', (event, match) => {
    try {
        fillCredentials(match);
    } catch (e) {
        console.warn('[QVault] fillCredentials error:', e);
    }
});

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
