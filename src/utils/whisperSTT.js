import { pipeline, env } from '@xenova/transformers';

// Disable local models to fetch from HF hub
env.allowLocalModels = false;

let transcriber = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let stream = null;

export const initWhisper = async (onProgress) => {
    if (!transcriber) {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
            progress_callback: onProgress
        });
    }
    return transcriber;
};

export const startRecording = async () => {
    if (isRecording) return;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.start();
        isRecording = true;
    } catch (err) {
        console.error('Microphone access denied or error:', err);
        throw err;
    }
};

export const stopRecordingAndTranscribe = async (onTranscriptionResult) => {
    if (!isRecording || !mediaRecorder) return;

    return new Promise((resolve, reject) => {
        mediaRecorder.onstop = async () => {
            try {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                isRecording = false;
                
                if (!transcriber) {
                    await initWhisper();
                }

                // Decode audio to 16kHz mono Float32Array for Whisper
                const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const audioData = audioBuffer.getChannelData(0); // Get mono channel

                // Run inference
                const output = await transcriber(audioData);
                if (output && output.text) {
                    if (onTranscriptionResult) onTranscriptionResult(output.text.trim());
                    resolve(output.text.trim());
                } else {
                    resolve('');
                }
            } catch (err) {
                console.error('Transcription error:', err);
                reject(err);
            }
        };

        mediaRecorder.stop();
    });
};

export const isCurrentlyRecording = () => isRecording;
