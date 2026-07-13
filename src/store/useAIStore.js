import { create } from 'zustand';
import useUIStore from './useUIStore';

const useAIStore = create((set, get) => ({
  rightPanelTab: 'ai',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  notesContent: '',
  setNotesContent: (content) => set({ notesContent: content }),

  hubToast: null,
  showHubToast: (msg) => {
    set({ hubToast: msg });
    setTimeout(() => set({ hubToast: null }), 2500);
  },

  aiContextEnabled: false,
  setAiContextEnabled: (val) => set({ aiContextEnabled: val }),

  chatInput: '',
  setChatInput: (input) => set({ chatInput: input }),

  isGenerating: false,
  setIsGenerating: (val) => set({ isGenerating: val }),

  hasDownloadedModel: false,
  setHasDownloadedModel: (val) => set({ hasDownloadedModel: val }),

  downloadProgress: 0,
  setDownloadProgress: (val) => set({ downloadProgress: val }),

  clipboardHistory: [
    { id: 1, type: 'text', content: 'function calculateOrbit(radius) {\n  return Math.PI * radius;\n}', time: '2 min ago' },
    { id: 2, type: 'url', content: 'https://github.com/tauri-apps/tauri', time: '45 min ago' },
    { id: 3, type: 'color', content: '#a855f7', time: '2 hrs ago' }
  ],
  setClipboardHistory: (history) => set({ clipboardHistory: history }),

  chatHistory: [
    { role: 'ai', content: "Hi! I'm Qu-AI, running locally via Tauri context. How can I help you today?" }
  ],
  setChatHistory: (history) => set({ chatHistory: typeof history === 'function' ? history(get().chatHistory) : history }),

  copyToHubClipboard: (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    get().showHubToast('Copied to clipboard!');
  },

  handleDownloadModel: () => {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => set({ hasDownloadedModel: true }), 500);
        }
        set({ downloadProgress: Math.min(progress, 100) });
    }, 200);
  },

  handleSendAI: () => {
    const { chatInput, isGenerating, aiContextEnabled } = get();
    if (!chatInput.trim() || isGenerating) return;

    const userMsg = chatInput.trim();
    const currentUrl = useUIStore.getState().currentUrl;
    const contextMsg = aiContextEnabled ? `\n\n[Context attached: ${currentUrl}]` : '';

    set(state => ({ chatHistory: [...state.chatHistory, { role: 'user', content: userMsg + contextMsg }], chatInput: '', isGenerating: true }));

    setTimeout(() => {
        set(state => ({
            chatHistory: [...state.chatHistory, {
                role: 'ai',
                content: `Local Gemma 4 processed: "${userMsg}". ${aiContextEnabled ? 'Site context analyzed.' : 'No context provided.'} Running isolated in VRAM.`
            }],
            isGenerating: false
        }));
    }, 1500);
  }
}));

export default useAIStore;
