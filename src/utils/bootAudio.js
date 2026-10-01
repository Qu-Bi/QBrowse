// Web Audio API Synthesized Chime for QBrowse
// Zero external files, zero latency, spatial stereo frequency layering.

export function playBootWelcomeChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.001, now);
        masterGain.gain.exponentialRampToValueAtTime(0.28, now + 0.15);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        // Warm chord: D Major 9th (D3, A3, F#4, C#5, E5) - Futuristic, uplifting, serene
        const notes = [
            { freq: 146.83, type: 'triangle', delay: 0.0, dur: 2.2, gain: 0.35 },  // D3 Bass Foundation
            { freq: 220.00, type: 'sine',     delay: 0.05, dur: 2.0, gain: 0.28 }, // A3 Warm fifth
            { freq: 369.99, type: 'sine',     delay: 0.12, dur: 1.8, gain: 0.22 }, // F#4 Major third
            { freq: 554.37, type: 'sine',     delay: 0.20, dur: 1.6, gain: 0.18 }, // C#5 Shimmering 7th
            { freq: 659.25, type: 'sine',     delay: 0.28, dur: 1.5, gain: 0.15 }  // E5 9th Sparkle
        ];

        notes.forEach(({ freq, type, delay, dur, gain: noteVolume }) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + delay);

            // Subtle pitch bend upwards (+2 Hz) for organic acoustic warmth
            osc.frequency.exponentialRampToValueAtTime(freq * 1.002, now + delay + dur);

            noteGain.gain.setValueAtTime(0.0001, now + delay);
            noteGain.gain.exponentialRampToValueAtTime(noteVolume, now + delay + 0.08);
            noteGain.gain.exponentialRampToValueAtTime(0.00001, now + delay + dur);

            osc.connect(noteGain);
            noteGain.connect(masterGain);

            osc.start(now + delay);
            osc.stop(now + delay + dur + 0.1);
        });

        // Add subtle stereo ambient stereo shimmer
        const shimmerOsc = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmerOsc.type = 'sine';
        shimmerOsc.frequency.setValueAtTime(1108.73, now + 0.35); // C#6 glass sparkle
        shimmerGain.gain.setValueAtTime(0.0001, now + 0.35);
        shimmerGain.gain.exponentialRampToValueAtTime(0.06, now + 0.45);
        shimmerGain.gain.exponentialRampToValueAtTime(0.00001, now + 1.8);
        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(masterGain);
        shimmerOsc.start(now + 0.35);
        shimmerOsc.stop(now + 1.9);

        setTimeout(() => {
            try { ctx.close(); } catch (_) {}
        }, 3000);
    } catch (e) {
        console.warn('[BootAudio] Web Audio failed:', e);
    }
}

// Web Audio API Synthesized Download Completion Chime
export function playDownloadCompleteChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.001, now);
        masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

        // Apple-style crisp harmonic chime: F5 (698.46 Hz) -> C6 (1046.50 Hz)
        const tones = [
            { freq: 698.46, delay: 0.0, dur: 0.28, gain: 0.22 },
            { freq: 1046.50, delay: 0.1, dur: 0.55, gain: 0.26 }
        ];

        tones.forEach(({ freq, delay, dur, gain: noteVolume }) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);

            noteGain.gain.setValueAtTime(0.0001, now + delay);
            noteGain.gain.exponentialRampToValueAtTime(noteVolume, now + delay + 0.02);
            noteGain.gain.exponentialRampToValueAtTime(0.00001, now + delay + dur);

            osc.connect(noteGain);
            noteGain.connect(masterGain);

            osc.start(now + delay);
            osc.stop(now + delay + dur + 0.05);
        });

        setTimeout(() => {
            try { ctx.close(); } catch (_) {}
        }, 1000);
    } catch (e) {
        console.warn('[DownloadAudio] Web Audio failed:', e);
    }
}

