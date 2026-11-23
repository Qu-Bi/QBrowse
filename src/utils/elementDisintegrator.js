// Safari-style pixel-dust disintegration animator for "Hide Distracting Items"

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function parseCssColorToRgba(cssColor, fallback = [212, 188, 148, 220]) {
    if (!cssColor || typeof cssColor !== 'string') return fallback;
    const match = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!match) return fallback;
    const a = match[4] !== undefined ? Math.round(parseFloat(match[4]) * 255) : 255;
    if (a < 15) return fallback;
    return [Number(match[1]), Number(match[2]), Number(match[3]), a];
}

export async function playDisintegrationAnimation({
    container,
    imageDataUrl,
    rect,
    clickPoint,
    fallbackColors,
    reducedMotion = false,
    performanceTier = 'balanced',
    onReady = null
}) {
    const ready = () => { const cb = onReady; onReady = null; try { cb && cb(); } catch (_) {} };
    if (!container || !rect || rect.width < 2 || rect.height < 2) { ready(); return; }

    const bounds = container.getBoundingClientRect();
    const cw = Math.max(1, Math.round(bounds.width));
    const ch = Math.max(1, Math.round(bounds.height));
    const dpr = Math.min(window.devicePixelRatio || 1, performanceTier === 'eco' ? 1 : 2);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:45;';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        canvas.remove();
        ready();
        return;
    }
    ctx.scale(dpr, dpr);

    let img = null;
    if (imageDataUrl) {
        try {
            img = await loadImage(imageDataUrl);
        } catch (_) {
            img = null;
        }
    }

    // Reduced motion: clean 200ms fade out of captured element snapshot
    if (reducedMotion) {
        const start = performance.now();
        const duration = 200;
        const primaryRgba = parseCssColorToRgba(fallbackColors?.bg);
        return new Promise((resolve) => {
            const step = (now) => {
                const progress = Math.min(1, (now - start) / duration);
                ctx.clearRect(0, 0, cw, ch);
                ctx.save();
                ctx.globalAlpha = 1 - progress;
                if (img) {
                    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
                } else {
                    ctx.fillStyle = `rgba(${primaryRgba[0]},${primaryRgba[1]},${primaryRgba[2]},${primaryRgba[3] / 255})`;
                    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                }
                ctx.restore();
                ready();
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    canvas.remove();
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    // Fine-grain sampling: tiny dust, many particles (Safari-like dissolve)
    const maxParticles = performanceTier === 'eco' ? 2500 : (performanceTier === 'ultra' ? 9000 : 5500);
    const area = Math.max(1, rect.width * rect.height);
    const stepSize = Math.max(2, Math.ceil(Math.sqrt(area / maxParticles)));

    const offscreen = document.createElement('canvas');
    const sw = Math.max(1, Math.round(rect.width));
    const sh = Math.max(1, Math.round(rect.height));
    offscreen.width = sw;
    offscreen.height = sh;
    const octx = offscreen.getContext('2d', { willReadFrequently: true });

    let pixelData = null;
    if (img && octx) {
        octx.drawImage(img, 0, 0, sw, sh);
        try {
            pixelData = octx.getImageData(0, 0, sw, sh).data;
        } catch (_) {
            pixelData = null;
        }
    }

    const bgRgba = parseCssColorToRgba(fallbackColors?.bg, [180, 180, 195, 220]);
    const textRgba = parseCssColorToRgba(fallbackColors?.color, [240, 240, 248, 220]);

    // Wave sweeps across the element along its longer axis, starting nearest the click
    const horizontal = rect.width >= rect.height;
    const clickLocal = horizontal
        ? ((typeof clickPoint?.x === 'number' ? clickPoint.x : rect.x) - rect.x) / Math.max(1, rect.width)
        : ((typeof clickPoint?.y === 'number' ? clickPoint.y : rect.y) - rect.y) / Math.max(1, rect.height);
    const startAt = Math.min(1, Math.max(0, clickLocal));

    const particles = [];
    for (let ly = 0; ly < sh; ly += stepSize) {
        for (let lx = 0; lx < sw; lx += stepSize) {
            let r, g, b, a;
            if (pixelData) {
                const px = Math.min(sw - 1, lx + (stepSize >> 1));
                const py = Math.min(sh - 1, ly + (stepSize >> 1));
                const idx = (py * sw + px) * 4;
                r = pixelData[idx]; g = pixelData[idx + 1]; b = pixelData[idx + 2]; a = pixelData[idx + 3];
                if (a < 18) continue;
            } else {
                const src = ((lx + ly) % (stepSize * 3) === 0) ? textRgba : bgRgba;
                r = src[0]; g = src[1]; b = src[2]; a = src[3];
            }

            const pos = horizontal ? lx / sw : ly / sh;
            const cross = horizontal ? ly / sh : lx / sw;
            const front = Math.abs(pos - startAt) * 0.34 + Math.sin(cross * 9) * 0.03;
            const delay = Math.max(0, front) + Math.random() * 0.06;

            const angle = (Math.random() - 0.5) * 1.5;
            const speed = 50 + Math.random() * 130;
            particles.push({
                x: rect.x + lx,
                y: rect.y + ly,
                size: Math.max(1.2, stepSize * (0.7 + Math.random() * 0.5)),
                vx: Math.cos(angle) * speed + 30,
                vy: Math.sin(angle) * speed * 0.7 - (30 + Math.random() * 70),
                phase: Math.random() * Math.PI * 2,
                delay,
                color: `rgb(${r},${g},${b})`,
                baseAlpha: a / 255
            });
        }
    }

    if (particles.length === 0) {
        canvas.remove();
        ready();
        return;
    }

    const maxDelay = particles.reduce((m, p) => Math.max(m, p.delay), 0);
    const totalDuration = 850;
    const startTime = performance.now();

    return new Promise((resolve) => {
        const frame = (now) => {
            const overall = Math.min(1, (now - startTime) / totalDuration);
            const t = overall * (1 + maxDelay);
            ctx.clearRect(0, 0, cw, ch);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const localT = t - p.delay;
                if (localT <= 0) {
                    ctx.globalAlpha = p.baseAlpha;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, stepSize, stepSize);
                    continue;
                }
                if (localT >= 1) continue;

                const ease = localT * localT * (3 - 2 * localT) * 0.5 + localT * 0.5;
                const alpha = Math.max(0, 1 - Math.pow(localT, 1.8)) * p.baseAlpha;
                const sz = p.size * (1 - localT * 0.6);
                const swirl = Math.sin(localT * 9 + p.phase) * 10 * localT;
                const px = p.x + p.vx * ease + swirl * 0.4;
                const py = p.y + p.vy * ease + swirl;

                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(px, py, sz, sz);
            }
            ctx.globalAlpha = 1;
            ready();

            if (overall < 1) {
                requestAnimationFrame(frame);
            } else {
                canvas.remove();
                resolve();
            }
        };
        requestAnimationFrame(frame);
    });
}
