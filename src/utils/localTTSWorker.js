import { pipeline, env, Tensor } from '@xenova/transformers';

// Ensure it downloads and caches locally in the browser
env.allowLocalModels = false; 
env.allowRemoteModels = true;
env.useBrowserCache = true;

let synthesizer = null;
let isInitializing = false;

// We use Xenova/mms-tts-eng which is smaller and sounds great
const MODEL_ID = 'Xenova/mms-tts-eng';

async function initSynthesizer() {
    if (synthesizer) return synthesizer;
    if (isInitializing) {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (synthesizer) {
                    clearInterval(check);
                    resolve(synthesizer);
                }
            }, 100);
        });
    }
    
    isInitializing = true;
    try {
        postMessage({ type: 'status', message: 'Loading local AI voice model (first time may take a minute)...' });
        
        synthesizer = await pipeline('text-to-speech', MODEL_ID, {
            quantized: true,
            progress_callback: (progress) => {
                postMessage({ type: 'progress', data: progress });
            }
        });
        
        postMessage({ type: 'status', message: 'Voice model loaded successfully.' });
        isInitializing = false;
        return synthesizer;
    } catch (err) {
        isInitializing = false;
        postMessage({ type: 'error', error: err.message });
        throw err;
    }
}

self.addEventListener('message', async (e) => {
    const { type, text, id } = e.data;
    
    if (type === 'speak') {
        try {
            const synth = await initSynthesizer();
            
            // Generate audio tensor
            const out = await synth(text);
            
            // out.audio is a Float32Array containing PCM audio data at out.sampling_rate
            postMessage({
                type: 'audio',
                id,
                audioData: out.audio,
                samplingRate: out.sampling_rate
            });
        } catch (err) {
            postMessage({ type: 'error', id, error: err.message });
        }
    }
});
