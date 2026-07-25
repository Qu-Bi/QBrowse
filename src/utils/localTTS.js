// localTTS.js - Wrapper to play audio using browser's built-in Web Speech API
import useUIStore from '../store/useUIStore';

let isPlaying = false;
let audioQueue = [];

export function speakLocal(text) {
    if (!text || !text.trim()) return;
    
    if (!window.speechSynthesis) {
        console.error("Web Speech API is not supported in this browser.");
        useUIStore.getState().showToast("TTS is not supported in this browser.");
        return;
    }
    
    // Split into sentences for more natural pauses
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
        if (sentence.trim()) {
            audioQueue.push(sentence.trim());
        }
    }
    
    playNextInQueue();
}

function playNextInQueue() {
    if (audioQueue.length > 0 && !isPlaying) {
        isPlaying = true;
        const nextText = audioQueue.shift();
        
        const utterance = new SpeechSynthesisUtterance(nextText);
        
        // Find a good English voice (preferably Google/Microsoft)
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Microsoft Zira') || v.lang.startsWith('en-US')) || voices[0];
            if (preferredVoice) utterance.voice = preferredVoice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        utterance.onend = () => {
            isPlaying = false;
            playNextInQueue();
        };
        
        utterance.onerror = (e) => {
            console.error('[Web Speech API] Error:', e);
            isPlaying = false;
            playNextInQueue();
        };
        
        window.speechSynthesis.speak(utterance);
    }
}

export function stopLocalTTS() {
    audioQueue = [];
    isPlaying = false;
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}
