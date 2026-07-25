const { ipcRenderer } = require('electron');

// Mask navigator.webdriver to pass Google Sign-In bot detection
try {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
} catch(e) {}

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

// Webview Preload Script for In-Page QVault Autofill (TrustedTypes Safe)
let activeBadge = null;

function removeBadge() {
    if (activeBadge) {
        activeBadge.remove();
        activeBadge = null;
    }
}

async function handleInputFocus(event) {
    const target = event.target;
    if (!target || !(target.tagName === 'INPUT')) return;

    const inputType = (target.type || 'text').toLowerCase();
    if (!['text', 'email', 'password'].includes(inputType)) return;

    try {
        const hostname = window.location.hostname;
        const matches = await ipcRenderer.invoke('vault-get-matching', hostname);
        if (!matches || matches.length === 0) return;

        removeBadge();

        const rect = target.getBoundingClientRect();

        const badge = document.createElement('div');
        badge.id = 'qvault-inline-autofill-badge';
        badge.style.position = 'fixed';
        badge.style.top = `${rect.bottom + 6}px`;
        badge.style.left = `${rect.left}px`;
        badge.style.zIndex = '2147483647';
        badge.style.backgroundColor = '#121316';
        badge.style.color = '#ffffff';
        badge.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        badge.style.borderRadius = '14px';
        badge.style.padding = '8px 12px';
        badge.style.fontSize = '12px';
        badge.style.fontWeight = '600';
        badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        badge.style.boxShadow = '0 12px 30px rgba(0,0,0,0.6)';
        badge.style.cursor = 'pointer';
        badge.style.display = 'flex';
        badge.style.flexDirection = 'column';
        badge.style.gap = '4px';
        badge.style.userSelect = 'none';

        if (matches.length === 1) {
            const match = matches[0];
            
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '6px';

            const keyIcon = document.createElement('span');
            keyIcon.style.color = '#3b82f6';
            keyIcon.textContent = '🔑';

            const textSpan = document.createElement('span');
            textSpan.textContent = `Fill ${match.username || match.title}`;

            container.appendChild(keyIcon);
            container.appendChild(textSpan);
            badge.appendChild(container);

            badge.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fillCredentials(target, match);
                removeBadge();
            });
        } else {
            // MULTIPLE ACCOUNTS SELECTOR (TrustedTypes Safe)
            const header = document.createElement('div');
            header.style.fontSize = '10px';
            header.style.textTransform = 'uppercase';
            header.style.letterSpacing = '0.05em';
            header.style.color = 'rgba(255,255,255,0.5)';
            header.style.marginBottom = '2px';
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '4px';

            const keyIcon = document.createElement('span');
            keyIcon.style.color = '#3b82f6';
            keyIcon.textContent = '🔑';

            const headerText = document.createElement('span');
            headerText.textContent = `Select Account (${matches.length})`;

            header.appendChild(keyIcon);
            header.appendChild(headerText);
            badge.appendChild(header);

            matches.forEach((m) => {
                const item = document.createElement('div');
                item.style.padding = '6px 10px';
                item.style.borderRadius = '10px';
                item.style.backgroundColor = 'rgba(255,255,255,0.06)';
                item.style.marginTop = '2px';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.gap = '12px';
                item.style.cursor = 'pointer';

                const titleSpan = document.createElement('span');
                titleSpan.style.fontWeight = '600';
                titleSpan.style.color = '#ffffff';
                titleSpan.textContent = m.title;

                const userSpan = document.createElement('span');
                userSpan.style.fontSize = '10px';
                userSpan.style.color = 'rgba(255,255,255,0.5)';
                userSpan.textContent = m.username || '';

                item.appendChild(titleSpan);
                item.appendChild(userSpan);

                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fillCredentials(target, m);
                    removeBadge();
                });

                badge.appendChild(item);
            });
        }

        document.body.appendChild(badge);
        activeBadge = badge;
    } catch (e) {
        console.error('QVault inline autofill error:', e);
    }
}

function fillCredentials(target, match) {
    const form = target.form || document;
    const userInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"]');
    const passInputs = form.querySelectorAll('input[type="password"], input[name*="pass"]');

    if (userInputs.length > 0 && match.username) {
        userInputs[0].value = match.username;
        userInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        userInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    } else if (target.type !== 'password' && match.username) {
        target.value = match.username;
        target.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (passInputs.length > 0 && match.password) {
        passInputs[0].value = match.password;
        passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        passInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    } else if (target.type === 'password' && match.password) {
        target.value = match.password;
        target.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Native WebAuthn & hardware security key support (YubiKey, Titan Key, Windows Hello)

window.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('focusin', handleInputFocus);
    document.addEventListener('click', (e) => {
        if (e.target && (e.target.tagName === 'INPUT')) {
            handleInputFocus(e);
        } else if (activeBadge && !activeBadge.contains(e.target)) {
            removeBadge();
        }
    });
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

        if (navigator.mediaSession && navigator.mediaSession.metadata) {
            const meta = navigator.mediaSession.metadata;
            title = meta.title || '';
            artist = meta.artist || meta.album || '';
            if (meta.artwork && meta.artwork.length > 0) {
                albumArt = meta.artwork[meta.artwork.length - 1].src || '';
            }
        }

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
document.addEventListener('timeupdate', sendMediaState, true);

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

// --- YOUTUBE NATIVE AD-SKIPPER ---
if (window.location.hostname.includes('youtube.com') && window === window.top) {
    let speedUpInterval = setInterval(() => {
        try {
            if (!document.body) return; // Wait for body to load
            
            const ad = document.querySelector('.ad-showing, .ad-interrupting');
            if (ad) {
                const video = document.querySelector('video');
                if (video) {
                    video.playbackRate = 16;
                    video.muted = true;
                }
                const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-text.ytp-ad-skip-button-text');
                if (skipBtn) skipBtn.click();
            }
        } catch(e) {}
    }, 250);
}
