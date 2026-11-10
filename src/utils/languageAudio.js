// Web Audio API Synthesized Cathedral Pipe Organ Chime for QBrowse
// Hans Zimmer / Interstellar style studio-mastered 48kHz stereo cathedral pipe organ chord.
// Features D1 36.7Hz sub-bass pedal resonance, 9 harmonic pipe stops, and Gothic cathedral reverberation.

import organWavUrl from '../assets/audio/cathedral_organ_warp.wav';

// Auto-detect user-supplied MP3 or custom WAV in assets directory
const audioGlob = import.meta.glob('../assets/audio/*.{mp3,wav}', { eager: true, import: 'default' });
const activeAudioUrl = audioGlob['../assets/audio/language_warp.mp3'] 
    || audioGlob['../assets/audio/cathedral_organ_warp.wav'] 
    || organWavUrl;

let cachedAudioBuffer = null;
let sharedAudioContext = null;

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioContext) {
        sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
}

// Preload and cache the studio-mastered audio buffer
export async function preloadLanguageAudio() {
    try {
        const ctx = getAudioContext();
        if (!ctx || cachedAudioBuffer) return;

        const response = await fetch(activeAudioUrl);
        const arrayBuffer = await response.arrayBuffer();
        cachedAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (_) {}
}

// Automatically initiate preload on import in browser environment
if (typeof window !== 'undefined') {
    preloadLanguageAudio();
}

/**
 * Plays the majestic cinematic reality warp chord.
 * Automatically prioritizes language_warp.mp3 if provided, falling back to cathedral_organ_warp.wav.
 */
export async function playLanguageSwitchChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
        }

        // 1. Primary: Studio audio buffer (MP3 or WAV)
        if (cachedAudioBuffer) {
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();

            source.buffer = cachedAudioBuffer;
            gainNode.gain.setValueAtTime(0.92, ctx.currentTime);

            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            source.start(0);
            return;
        }

        // If buffer is still loading asynchronously, attempt quick decode
        try {
            const response = await fetch(activeAudioUrl);
            const arrayBuffer = await response.arrayBuffer();
            cachedAudioBuffer = await ctx.decodeAudioData(arrayBuffer);

            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();

            source.buffer = cachedAudioBuffer;
            gainNode.gain.setValueAtTime(0.92, ctx.currentTime);

            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            source.start(0);
            return;
        } catch (_) {}

        // 2. High-Fidelity Synthesized Fallback (warm analog physics, no harsh aliasing)
        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.linearRampToValueAtTime(0.40, now + 0.12);
        masterGain.gain.exponentialRampToValueAtTime(0.00001, now + 2.4);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(1000, now + 1.8);

        masterGain.connect(filter);
        filter.connect(ctx.destination);

        const pipes = [
            { f: 36.71, v: 0.50, t: 'sine' },     // D1 Sub-bass
            { f: 73.42, v: 0.42, t: 'triangle' }, // D2 Bass
            { f: 110.0, v: 0.35, t: 'sine' },     // A2
            { f: 146.8, v: 0.32, t: 'triangle' }, // D3
            { f: 185.0, v: 0.28, t: 'sine' },     // F#3
            { f: 220.0, v: 0.25, t: 'triangle' }, // A3
            { f: 293.6, v: 0.20, t: 'sine' },     // D4
            { f: 659.2, v: 0.14, t: 'sine' }      // E5 9th
        ];

        pipes.forEach(({ f, v, t }) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = t;
            osc.frequency.setValueAtTime(f, now);

            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(v, now + 0.10);
            g.gain.exponentialRampToValueAtTime(0.00001, now + 2.2);

            osc.connect(g);
            g.connect(masterGain);
            osc.start(now);
            osc.stop(now + 2.3);
        });

    } catch (_) {}
}
