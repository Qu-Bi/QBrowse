import { create } from 'zustand';
import { performWebSearch } from '../utils/webSearch';
import { speakLocal, stopLocalTTS } from '../utils/localTTS';

export const MODEL_PRESETS = [
    {
        id: 'gemma-4-e2b',
        name: 'Gemma 4 E2B Instruct (Q4_0)',
        size: '2.04 GB (Model) + 557 MB (Vision)',
        url: 'https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_0.gguf',
        filename: 'gemma-4-E2B-it-Q4_0.gguf',
        mmprojUrl: 'https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/resolve/main/mmproj-gemma-4-E2B-it-Q8_0.gguf',
        mmprojFilename: 'mmproj-gemma-4-E2B-it-Q8_0.gguf',
        description: 'Unsloth Gemma 4 E2B Instruct GGUF model with full Multimodal Vision support for analyzing images and chat.'
    },
    {
        id: 'gemma-4-e4b',
        name: 'Gemma 4 E4B Instruct (Q4_0)',
        size: '4.59 GB (Model) + 560 MB (Vision)',
        url: 'https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_0.gguf',
        filename: 'gemma-4-E4B-it-Q4_0.gguf',
        mmprojUrl: 'https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF/resolve/main/mmproj-gemma-4-E4B-it-Q8_0.gguf',
        mmprojFilename: 'mmproj-gemma-4-E4B-it-Q8_0.gguf',
        description: 'High reasoning Unsloth Gemma 4 E4B model with full Multimodal Vision support for complex analysis.'
    }
];

const useAIStore = create((set, get) => ({
    // Server State
    isRunning: false,
    status: 'stopped', // 'stopped' | 'starting' | 'running' | 'error' | 'downloading'
    activeModelId: localStorage.getItem('qbrowse_ai_model') || 'gemma-4-e2b',
    customModelPath: localStorage.getItem('qbrowse_ai_custom_path') || '',
    customMmprojPath: localStorage.getItem('qbrowse_ai_custom_mmproj') || '',
    logs: [],
    metrics: {
        tokensPerSecond: 0,
        evalTimeMs: 0,
        promptEvalTimeMs: 0
    },

    // llama.cpp Server Parameters
    threads: parseInt(localStorage.getItem('qbrowse_ai_threads') || '8', 10),
    contextSize: parseInt(localStorage.getItem('qbrowse_ai_ctx') || '4096', 10),
    gpuLayers: parseInt(localStorage.getItem('qbrowse_ai_ngl') || '0', 10),
    temperature: parseFloat(localStorage.getItem('qbrowse_ai_temp') || '0.7'),
    port: 8080,

    // Chat History & Attachments
    chatHistory: [
        {
            role: 'ai',
            content: "Welcome to QBrowse AI! Powered by local llama.cpp engine (Gemma 4 architecture). How can I assist your browsing today?",
            attachments: []
        }
    ],
    chatInput: '',
    attachedFiles: [], // Array of { name, size, type, content, dataUrl }
    aiContextEnabled: true,
    ttsEnabled: false,
    webSearchEnabled: false, // Default to false so it doesn't search web by default
    isGenerating: false,
    downloadProgress: null,
    parsePdfAsImage: true,

    // Actions
    setChatInput: (val) => set(state => ({ chatInput: typeof val === 'function' ? val(state.chatInput) : val })),
    setAiContextEnabled: (val) => set({ aiContextEnabled: val }),
    setTtsEnabled: (val) => set({ ttsEnabled: val }),
    setWebSearchEnabled: (val) => set({ webSearchEnabled: val }),
    toggleTTS: () => set(state => ({ ttsEnabled: !state.ttsEnabled })),
    toggleWebSearch: () => set(state => ({ webSearchEnabled: !state.webSearchEnabled })),
    setParsePdfAsImage: (val) => set({ parsePdfAsImage: val }),
    addAttachment: (fileObj) => set(state => ({ attachedFiles: [...state.attachedFiles, fileObj] })),
    removeAttachment: (index) => set(state => ({ attachedFiles: state.attachedFiles.filter((_, i) => i !== index) })),
    clearAttachments: () => set({ attachedFiles: [] }),

    setActiveModelId: (modelId) => {
        set({ activeModelId: modelId });
        localStorage.setItem('qbrowse_ai_model', modelId);
    },

    setCustomModelPath: (path) => {
        set({ customModelPath: path });
        localStorage.setItem('qbrowse_ai_custom_path', path);
    },

    setCustomMmprojPath: (path) => {
        set({ customMmprojPath: path });
        localStorage.setItem('qbrowse_ai_custom_mmproj', path);
    },

    setThreads: (val) => {
        set({ threads: val });
        localStorage.setItem('qbrowse_ai_threads', val.toString());
    },

    setContextSize: (val) => {
        set({ contextSize: val });
        localStorage.setItem('qbrowse_ai_ctx', val.toString());
    },

    setGpuLayers: (val) => {
        set({ gpuLayers: val });
        localStorage.setItem('qbrowse_ai_ngl', val.toString());
    },

    setTemperature: (val) => {
        set({ temperature: val });
        localStorage.setItem('qbrowse_ai_temp', val.toString());
    },

    addLog: (logLine) => set(state => ({ logs: [...state.logs.slice(-499), logLine] })),
    clearLogs: () => set({ logs: [] }),

    // llama.cpp Process Controller Actions
    startEngine: async () => {
        set({ status: 'starting' });
        const { activeModelId, customModelPath, customMmprojPath, threads, contextSize, gpuLayers, temperature, port } = get();
        let modelPath = customModelPath;
        let mmprojPath = customMmprojPath;

        if (!modelPath) {
            const preset = MODEL_PRESETS.find(m => m.id === activeModelId) || MODEL_PRESETS[0];
            modelPath = preset.filename;
            if (!mmprojPath && preset.mmprojFilename) {
                mmprojPath = preset.mmprojFilename;
            }
        }

        if (window.electronAPI && typeof window.electronAPI.startAiServer === 'function') {
            const res = await window.electronAPI.startAiServer({
                modelPath,
                mmprojPath,
                threads,
                contextSize,
                gpuLayers,
                temp: temperature,
                port
            });
            if (res && res.success) {
                set({ isRunning: true, status: 'running' });
            } else {
                set({ isRunning: false, status: 'error' });
            }
        } else {
            // Web fallback simulation
            setTimeout(() => {
                set({ isRunning: true, status: 'running', metrics: { tokensPerSecond: 38.4 } });
            }, 800);
        }
    },

    stopEngine: async () => {
        if (window.electronAPI && typeof window.electronAPI.stopAiServer === 'function') {
            await window.electronAPI.stopAiServer();
        }
        set({ isRunning: false, status: 'stopped' });
    },

    toggleEngine: async () => {
        const { isRunning } = get();
        if (isRunning) {
            await get().stopEngine();
        } else {
            await get().startEngine();
        }
    },

    downloadedModels: [],
    downloadDetail: null,

    fetchEngineStatus: async () => {
        if (window.electronAPI && typeof window.electronAPI.getAiStatus === 'function') {
            try {
                const res = await window.electronAPI.getAiStatus();
                if (res) {
                    set({
                        isRunning: res.isRunning,
                        metrics: res.metrics || get().metrics,
                        downloadedModels: res.downloadedModels || []
                    });
                }
            } catch(e) {}
        }
    },

    downloadModel: async (presetObj) => {
        set({
            activeModelId: presetObj.id,
            status: 'downloading',
            downloadProgress: 0,
            downloadDetail: { percent: 0, downloadedBytes: 0, totalBytes: 0 }
        });
        
        if (window.electronAPI && typeof window.electronAPI.downloadAiModel === 'function') {
            let unsub = null;
            if (typeof window.electronAPI.onAiDownloadProgress === 'function') {
                unsub = window.electronAPI.onAiDownloadProgress((progress) => {
                    set({ 
                        downloadProgress: progress.percent,
                        downloadDetail: progress
                    });
                });
            }

            try {
                // Download Main Model
                await window.electronAPI.downloadAiModel({
                    url: presetObj.url,
                    filename: presetObj.filename
                });
                
                // Download mmproj if required
                if (presetObj.mmprojUrl) {
                    set({ downloadProgress: 0, downloadDetail: { percent: 0, downloadedBytes: 0, totalBytes: 0 } });
                    await window.electronAPI.downloadAiModel({
                        url: presetObj.mmprojUrl,
                        filename: presetObj.mmprojFilename
                    });
                }

                if (unsub) unsub();
                set({ status: 'stopped', downloadProgress: 100 });
                get().setActiveModelId(presetObj.id);
                get().fetchEngineStatus();
            } catch(e) {
                if (unsub) unsub();
                set({ status: 'error', downloadProgress: null });
            }
        } else {
            // Web browser simulated progress stream
            let p = 0;
            const timer = setInterval(() => {
                p += 5;
                const downloadedBytes = Math.round((p / 100) * 1.6 * 1024 * 1024 * 1024);
                set({ 
                    downloadProgress: p,
                    downloadDetail: { percent: p, downloadedBytes, totalBytes: 1.6 * 1024 * 1024 * 1024 }
                });

                if (p >= 100) {
                    clearInterval(timer);
                    set({ 
                        status: 'stopped', 
                        downloadProgress: 100,
                        downloadedModels: [
                            ...get().downloadedModels,
                            { filename: presetObj.filename, path: presetObj.filename }
                        ]
                    });
                    get().setActiveModelId(presetObj.id);
                }
            }, 200);
        }
    },

    // Send AI Stream Request to Local HTTP llama-server (127.0.0.1:8080)
    sendChatMessage: async (promptText, pageContext = '') => {
        let { chatInput, attachedFiles, aiContextEnabled, isRunning, chatHistory, startEngine } = get();
        const query = promptText || chatInput;
        if (!query.trim()) return;

        if (!isRunning) {
            await startEngine();
            isRunning = get().isRunning;
        }

        const currentAttachments = [...attachedFiles];
        const userMsg = {
            role: 'user',
            content: query,
            attachments: currentAttachments,
            pageContext: aiContextEnabled ? pageContext : ''
        };

        set(state => ({
            chatHistory: [...state.chatHistory, userMsg],
            chatInput: '',
            attachedFiles: [],
            isGenerating: true
        }));

        await get().runChatCompletion();
    },

    runChatCompletion: async () => {
        const { chatHistory, temperature, aiContextEnabled, ttsEnabled } = get();
        
        // Build message payload from history
        const apiMessages = [{ role: 'system', content: "You are Qu-AI, a helpful, precise local AI assistant." }];
        
        for (const msg of chatHistory) {
            if (msg.role === 'user') {
                const imageAttachments = msg.attachments ? msg.attachments.filter(a => a.type === 'image' && a.dataUrl) : [];
                const textAttachments = msg.attachments ? msg.attachments.filter(a => a.type === 'text') : [];
                
                const contextText = msg.pageContext ? `\n[Current Web Page: ${msg.pageContext}]` : '';
                const filesText = textAttachments.length > 0
                    ? `\n[Attached Files:\n${textAttachments.map(a => `--- ${a.name} ---\n${a.content ? a.content.substring(0, 8000) : '(No readable text)'}\n---`).join('\n')}]`
                    : '';

                const fullPrompt = `${msg.content}${contextText}${filesText}`;
                
                if (imageAttachments.length > 0) {
                    apiMessages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: fullPrompt },
                            ...imageAttachments.map(a => ({ type: 'image_url', image_url: { url: a.dataUrl } }))
                        ]
                    });
                } else {
                    apiMessages.push({ role: 'user', content: fullPrompt });
                }
            } else if (msg.role === 'ai') {
                apiMessages.push({ role: 'assistant', content: msg.content, tool_calls: msg.tool_calls });
            } else if (msg.role === 'tool') {
                apiMessages.push({ role: 'tool', name: msg.name, content: msg.content });
            }
        }

        // Add placeholder AI response
        const aiMsgIndex = get().chatHistory.length;
        set(state => ({
            chatHistory: [
                ...state.chatHistory,
                { role: 'ai', content: '', attachments: [] }
            ]
        }));

        try {
            const abortController = new AbortController();
            set({ currentAbortController: abortController, isGenerating: true });
            
            const tools = get().webSearchEnabled ? [{
                type: "function",
                function: {
                    name: "web_search",
                    description: "Perform a web search using DuckDuckGo to find real-time information or answer questions you don't know.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "The search query" }
                        },
                        required: ["query"]
                    }
                }
            }] : undefined;

            const response = await fetch('http://127.0.0.1:8080/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify({
                    messages: apiMessages,
                    stream: true,
                    temperature: temperature,
                    tools: tools
                })
            });

            if (response.ok && response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let accumulated = '';
                let toolCallDeltas = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            if (jsonStr.trim() === '[DONE]') break;
                            try {
                                const parsed = JSON.parse(jsonStr);
                                const token = parsed.choices?.[0]?.delta?.content || '';
                                if (token) accumulated += token;
                                
                                // Handle tool calls
                                const tcs = parsed.choices?.[0]?.delta?.tool_calls;
                                if (tcs) {
                                    for (const tc of tcs) {
                                        const idx = tc.index;
                                        if (!toolCallDeltas[idx]) toolCallDeltas[idx] = { function: { name: '', arguments: '' } };
                                        if (tc.id) toolCallDeltas[idx].id = tc.id;
                                        if (tc.function?.name) toolCallDeltas[idx].function.name += tc.function.name;
                                        if (tc.function?.arguments) toolCallDeltas[idx].function.arguments += tc.function.arguments;
                                    }
                                }

                                set(state => {
                                    const updated = [...state.chatHistory];
                                    if (updated[aiMsgIndex]) {
                                        updated[aiMsgIndex] = { ...updated[aiMsgIndex], content: accumulated };
                                        if (toolCallDeltas.length > 0) {
                                            // Only expose valid tool calls
                                            updated[aiMsgIndex].tool_calls = toolCallDeltas.filter(Boolean).map(tc => ({
                                                id: tc.id || `call_${Math.random().toString(36).substr(2, 9)}`,
                                                type: 'function',
                                                function: { name: tc.function.name, arguments: tc.function.arguments }
                                            }));
                                        }
                                    }
                                    return { chatHistory: updated };
                                });
                            } catch(e) {}
                        }
                    }
                }
                
                // If there were tool calls, execute them!
                const finalToolCalls = get().chatHistory[aiMsgIndex]?.tool_calls;
                if (finalToolCalls && finalToolCalls.length > 0) {
                    for (const tc of finalToolCalls) {
                        if (tc.function.name === 'web_search') {
                            set(state => {
                                const updated = [...state.chatHistory];
                                updated[aiMsgIndex].content = `${accumulated}\n\n*Searching the web for "${JSON.parse(tc.function.arguments).query}"...*`;
                                return { chatHistory: updated };
                            });
                            
                            let searchArgs;
                            try {
                                searchArgs = JSON.parse(tc.function.arguments);
                            } catch(e) {
                                searchArgs = { query: tc.function.arguments }; // fallback
                            }
                            
                            const results = await performWebSearch(searchArgs.query);
                            
                            // Append tool response
                            set(state => ({
                                chatHistory: [
                                    ...state.chatHistory,
                                    { role: 'tool', name: tc.function.name, content: results, attachments: [] }
                                ]
                            }));
                        }
                    }
                    
                    // Recursively call to get the final answer
                    await get().runChatCompletion();
                    return;
                }

                set({ isGenerating: false });
                
                // Read message aloud if TTS is enabled
                if (ttsEnabled && accumulated.trim()) {
                    speakLocal(accumulated.trim());
                }
                return;
            } else {
                let errorText = 'Unknown Error';
                try {
                    const errJson = await response.json();
                    errorText = errJson.error?.message || JSON.stringify(errJson);
                } catch (e) {
                    errorText = await response.text();
                }
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch(err) {
            if (err.name === 'AbortError') {
                set({ isGenerating: false });
                return;
            }
            console.warn('HTTP endpoint error:', err);
            set(state => {
                const updated = [...state.chatHistory];
                if (updated[aiMsgIndex]) {
                    updated[aiMsgIndex] = { role: 'ai', content: `Unable to connect to llama-server on http://127.0.0.1:8080. Error: ${err.message}` };
                }
                
                // If llama-server complains that image input is not supported, strip the image from the previous user message
                // so that it doesn't perpetually crash subsequent chat messages.
                if (err.message.includes('image input is not supported')) {
                    const prevMsgIndex = aiMsgIndex - 1;
                    if (prevMsgIndex >= 0 && updated[prevMsgIndex].role === 'user') {
                        updated[prevMsgIndex] = {
                            ...updated[prevMsgIndex],
                            attachments: updated[prevMsgIndex].attachments?.filter(a => a.type !== 'image') || []
                        };
                    }
                }
                
                return { chatHistory: updated, isGenerating: false };
            });
        }
    },

    stopChatMessage: async () => {
        const { currentAbortController } = get();
        if (currentAbortController) {
            try {
                const slotsRes = await fetch('http://127.0.0.1:8080/slots');
                if (slotsRes.ok) {
                    const slotsData = await slotsRes.json();
                    for (const slot of slotsData) {
                        if (slot.state === 1 || slot.state === 2) {
                            await fetch(`http://127.0.0.1:8080/slots/${slot.id}?action=cancel`, { method: 'POST' }).catch(() => {});
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to explicitly cancel llama slots', err);
            }
            stopLocalTTS();
            currentAbortController.abort();
        }
    },

    clearHistory: () => set({ chatHistory: [] }),
}));

export default useAIStore;
