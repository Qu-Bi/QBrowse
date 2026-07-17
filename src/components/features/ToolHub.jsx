import React, { useState } from 'react';
import { 
    Puzzle, X, PenTool, ClipboardList, MessageSquare, 
    Copy, Cpu, Download, Zap, Globe, Send 
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function ToolHub() {
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const setIsRightPanelOpen = useUIStore(state => state.setIsRightPanelOpen);
    const rightPanelTab = useUIStore(state => state.rightPanelTab);
        const setRightPanelTab = useUIStore(state => state.setRightPanelTab);
    const downloads = useUIStore(state => state.downloads);
    const currentUrl = useUIStore(state => state.currentUrl);

    const [notesContent, setNotesContent] = useState('');
    const [hubToast, setHubToast] = useState(null);
    const [aiContextEnabled, setAiContextEnabled] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasDownloadedModel, setHasDownloadedModel] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const [clipboardHistory, setClipboardHistory] = useState([
        { id: 1, type: 'text', content: 'function calculateOrbit(radius) {\n  return Math.PI * radius;\n}', time: '2 min ago' },
        { id: 2, type: 'url', content: 'https://github.com/tauri-apps/tauri', time: '45 min ago' },
        { id: 3, type: 'color', content: '#a855f7', time: '2 hrs ago' }
    ]);

    const [chatHistory, setChatHistory] = useState([
        { role: 'ai', content: "Hi! I'm Qu-AI, running locally via Tauri context. How can I help you today?" }
    ]);

    const showHubToast = (msg) => {
        setHubToast(msg);
        setTimeout(() => setHubToast(null), 2500);
    };

    const copyToHubClipboard = (text) => {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showHubToast('Copied to clipboard!');
    };

    const handleDownloadModel = () => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => setHasDownloadedModel(true), 500);
            }
            setDownloadProgress(Math.min(progress, 100));
        }, 200);
    };

    const handleSendAI = () => {
        if (!chatInput.trim() || isGenerating) return;

        const userMsg = chatInput.trim();
        const contextMsg = aiContextEnabled ? `\n\n[Context attached: ${currentUrl}]` : '';

        setChatHistory(prev => [...prev, { role: 'user', content: userMsg + contextMsg }]);
        setChatInput('');
        setIsGenerating(true);

        setTimeout(() => {
            setChatHistory(prev => [...prev, {
                role: 'ai',
                content: `Local Gemma 4 processed: "${userMsg}". ${aiContextEnabled ? 'Site context analyzed.' : 'No context provided.'} Running isolated in VRAM.`
            }]);
            setIsGenerating(false);
        }, 1500);
    };

    return (
        <>
            {/* Click-outside backdrop */}
            {isRightPanelOpen && (
                <div 
                    className="fixed inset-0 z-[44999] bg-transparent" 
                    onClick={() => setIsRightPanelOpen(false)}
                />
            )}
            
            <div
                className="fixed right-0 top-1/2 -translate-y-1/2 w-4 h-40 z-[40000] cursor-pointer group flex items-center justify-end pr-1"
                onClick={() => setIsRightPanelOpen(true)}
            >
                <div className={`w-1 h-12 rounded-full transition-all duration-300 ease-out group-hover:h-24 ${isRightPanelOpen ? 'bg-transparent' : 'bg-white/10 group-hover:bg-accent/60 group-hover:shadow-[0_0_15px_var(--accent-30)]'}`}></div>
            </div>

            <div className={`fixed top-4 bottom-4 right-4 w-96 md:w-[450px] bg-[#0a0a0c]/95 border border-white/10 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col z-[45000] transform-gpu transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isRightPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-[110%] opacity-0'}`} onClick={e => e.stopPropagation()}>

                {hubToast && (
                    <div className="absolute -left-32 top-1/2 -translate-y-1/2 bg-accent text-black px-3 py-1.5 rounded-lg text-xs font-bold animate-pop-in shadow-lg">
                        {hubToast}
                    </div>
                )}

                <div className="p-5 pb-3 flex justify-between items-center border-b border-white/5">
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Puzzle size={18} className="text-accent" /> Tool Hub
                    </h2>
                    <button onClick={() => setIsRightPanelOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="px-5 pt-4 pb-2">
                    <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl relative">
                        <div
                            className="absolute top-1 bottom-1 bg-accent-20 border border-accent-30 rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-sm"
                            style={{ width: 'calc(25% - 2px)', transform: `translateX(${rightPanelTab === 'notes' ? '0%' : rightPanelTab === 'clipboard' ? '100%' : rightPanelTab === 'ai' ? '200%' : '300%'})` }}
                        ></div>
                        <button onClick={() => setRightPanelTab('notes')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'notes' ? 'text-accent' : 'text-white/40 hover:text-white'}`}><PenTool size={12} /> Notes</button>
                        <button onClick={() => setRightPanelTab('clipboard')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'clipboard' ? 'text-accent' : 'text-white/40 hover:text-white'}`}><ClipboardList size={12} /> Copied</button>
                        <button onClick={() => setRightPanelTab('ai')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'ai' ? 'text-accent' : 'text-white/40 hover:text-white'}`}><MessageSquare size={12} /> Qu-AI</button>
                        <button onClick={() => setRightPanelTab('downloads')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'downloads' ? 'text-accent' : 'text-white/40 hover:text-white'}`}><Download size={12} /> DL</button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <div className={`absolute inset-0 p-5 transition-all duration-300 ${rightPanelTab === 'notes' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 -translate-x-4 pointer-events-none z-0'}`}>
                        <textarea
                            value={notesContent}
                            onChange={e => setNotesContent(e.target.value)}
                            placeholder="Jot down quick thoughts, markdown supported..."
                            className="w-full h-full bg-transparent text-sm text-white/90 placeholder-white/30 resize-none outline-none hide-scroll leading-relaxed"
                            spellCheck="false"
                        />
                    </div>

                    <div className={`absolute inset-0 p-5 overflow-y-auto hide-scroll transition-all duration-300 ${rightPanelTab === 'clipboard' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-4 pointer-events-none z-0'}`}>
                        <div className="flex flex-col gap-2">
                            {clipboardHistory.map((item, i) => (
                                <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition cursor-pointer group animate-pop-in" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => copyToHubClipboard(item.content)}>
                                    {item.type === 'color' ? (
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.content }}></div>
                                            <span className="text-xs text-white/80 font-mono">{item.content}</span>
                                        </div>
                                    ) : (
                                        <p className={`text-xs text-white/80 line-clamp-3 leading-relaxed ${item.type === 'text' ? 'font-mono' : ''}`}>{item.content}</p>
                                    )}
                                    <div className="flex justify-between items-center mt-3">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">{item.time}</span>
                                        <Copy size={12} className="text-white/20 group-hover:text-accent transition" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2 border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-xs font-semibold transition" onClick={() => { setClipboardHistory([]); showHubToast('Clipboard cleared'); }}>Clear History</button>
                    </div>

                    <div className={`absolute inset-0 p-5 pb-4 flex flex-col transition-all duration-300 ${rightPanelTab === 'ai' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-4 pointer-events-none z-0'}`}>
                        {!hasDownloadedModel ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center animate-pop-in">
                                <div className="w-20 h-20 rounded-3xl bg-accent-10 flex items-center justify-center border border-accent-20 mb-6 relative">
                                    <Cpu size={32} className="text-accent" />
                                    <div className="absolute -bottom-2 -right-2 bg-black border border-white/10 px-2 py-0.5 rounded-md text-[9px] font-mono text-white/70">GGUF</div>
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-white mb-2">Local AI Engine</h3>
                                <p className="text-xs text-white/50 mb-8 leading-relaxed px-4">Download Gemma 4 weights to your VRAM. No data leaves your machine. Full privacy.</p>

                                {downloadProgress > 0 ? (
                                    <div className="w-full px-6 flex flex-col gap-2">
                                        <div className="flex justify-between text-[10px] font-mono text-white/40">
                                            <span>Downloading weights...</span>
                                            <span className="text-accent">{Math.round(downloadProgress)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-black/60 border border-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-accent rounded-full" style={{ width: `${downloadProgress}%` }}></div>
                                        </div>
                                        <span className="text-[8px] font-mono text-white/30 mt-2">llama.cpp / 4.2 GB</span>
                                    </div>
                                ) : (
                                    <button onClick={handleDownloadModel} className="px-6 py-3 bg-accent text-black rounded-xl text-xs font-bold shadow-[0_5px_20px_var(--accent-30)] hover:scale-[1.02] transition-transform flex items-center gap-2">
                                        <Download size={14} /> Download Weights
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto hide-scroll flex flex-col gap-4 animate-pop-in">
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex items-start gap-3 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            {msg.role === 'ai' && (
                                                <div className="w-6 h-6 rounded-full bg-accent text-black flex items-center justify-center flex-shrink-0 mt-1 shadow-[0_0_10px_var(--accent-30)]"><Zap size={12} /></div>
                                            )}
                                            <div className={`${msg.role === 'user' ? 'bg-accent-20 border-accent-30' : 'bg-white/5 border-white/10'} border text-white/90 p-3 rounded-2xl ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'} text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}

                                    {isGenerating && (
                                        <div className="flex items-start gap-3 w-full">
                                            <div className="w-6 h-6 rounded-full bg-accent text-black flex items-center justify-center flex-shrink-0 mt-1"><Zap size={12} className="animate-pulse" /></div>
                                            <div className="bg-white/5 border border-white/10 text-white/90 p-3 rounded-2xl rounded-tl-sm text-xs flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-col gap-2">
                                    <button
                                        onClick={() => setAiContextEnabled(!aiContextEnabled)}
                                        className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${aiContextEnabled ? 'bg-accent-20 border-accent-30 text-accent shadow-[0_0_15px_var(--accent-10)]' : 'bg-black/40 border-white/10 text-white/40 hover:text-white/80'}`}
                                    >
                                        <Globe size={12} />
                                        {aiContextEnabled ? 'Website Context: ON' : 'Website Context: OFF'}
                                        {aiContextEnabled && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse ml-1 shadow-[0_0_5px_var(--accent)]"></div>}
                                    </button>
                                    <div className={`relative bg-black/40 border rounded-xl transition-all flex items-center ${aiContextEnabled ? 'border-accent/40 shadow-[0_0_20px_var(--accent-10)]' : 'border-white/10 focus-within:border-white/30'}`}>
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendAI(); } }}
                                            placeholder="Ask Qu-AI..."
                                            className="flex-1 bg-transparent py-3 pl-4 pr-1 text-xs text-white outline-none"
                                        />
                                        <div className="pr-1 flex items-center gap-1">
                                            <button onClick={handleSendAI} disabled={!chatInput.trim() || isGenerating} className="w-7 h-7 bg-accent text-black rounded-lg flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_10px_var(--accent-40)] disabled:opacity-50 disabled:hover:scale-100">
                                                <Send size={12} className="ml-0.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-2 flex items-center justify-center gap-2">
                                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Model: Local Gemma 4 (GGUF)</span>
                                </div>
                            </>
                        )}
                    </div>
                    <div className={`absolute inset-0 p-5 overflow-y-auto hide-scroll transition-all duration-300 ${rightPanelTab === 'downloads' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-4 pointer-events-none z-0'}`}>
                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-bold text-white/90 mb-2">Active Downloads</h3>
                            
                            {downloads.length === 0 && (
                                <div className="text-center text-white/40 text-xs italic py-4">No downloads yet.</div>
                            )}

                            {downloads.map(dl => (
                                <div key={dl.id} className="p-3 bg-white/5 border border-white/10 rounded-xl animate-pop-in relative overflow-hidden group">
                                    {dl.state === 'progressing' && (
                                        <div className="absolute top-0 left-0 bottom-0 bg-accent/20 transition-all duration-300 ease-linear" style={{ width: `${(dl.receivedBytes / dl.totalBytes) * 100}%` }}></div>
                                    )}
                                    <div className="relative z-10 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-white/90 truncate max-w-[180px]" title={dl.fileName}>{dl.fileName}</span>
                                                <span className="text-[10px] text-white/40 font-mono mt-0.5">
                                                    {dl.state === 'progressing' ? `${(dl.receivedBytes / 1024 / 1024).toFixed(2)} MB / ${(dl.totalBytes / 1024 / 1024).toFixed(2)} MB` : (dl.state === 'completed' ? 'Done' : dl.state)}
                                                </span>
                                            </div>
                                            {dl.state === 'completed' ? (
                                                <span className="text-[10px] font-bold text-green-400 group-hover:scale-110 transition-transform">Done</span>
                                            ) : (
                                                <button className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                        {dl.state === 'progressing' && (
                                            <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden mt-1">
                                                <div className="h-full bg-accent rounded-full transition-all duration-300 shadow-[0_0_10px_var(--accent)]" style={{ width: `${(dl.receivedBytes / dl.totalBytes) * 100}%` }}></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                    

                </div>
            </div>
        </>
    );
}
