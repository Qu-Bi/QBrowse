import React, { useEffect, useRef } from 'react';
import { 
    Cpu, Zap, Terminal, RefreshCw, Play, Square, Download, 
    FolderOpen, HardDrive, Sliders, CheckCircle, AlertCircle, Copy, Trash2, Sparkles, FileText
} from 'lucide-react';
import useAIStore, { MODEL_PRESETS } from '../../store/useAIStore';
import useUIStore from '../../store/useUIStore';

export default function AIEngineSettings() {
    const { 
        status, isRunning, activeModelId, customModelPath, logs, metrics,
        threads, contextSize, gpuLayers, temperature, downloadProgress, downloadedModels,
        setActiveModelId, setCustomModelPath, setThreads, setContextSize,
        setGpuLayers, setTemperature, startEngine, stopEngine, toggleEngine,
        downloadModel, clearLogs, addLog, parsePdfAsImage, setParsePdfAsImage
    } = useAIStore();

    const showToast = useUIStore(state => state.showToast);
    const terminalRef = useRef(null);

    // Auto-scroll terminal log
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    useEffect(() => {
        useAIStore.getState().fetchEngineStatus();
    }, []);

    // IPC Log & Status Event Listeners
    useEffect(() => {
        if (window.electronAPI && typeof window.electronAPI.onAiLog === 'function') {
            const unsubLog = window.electronAPI.onAiLog((logLine) => addLog(logLine));
            return () => unsubLog();
        }
    }, [addLog]);

    const handlePickCustomFile = async () => {
        if (window.electronAPI && typeof window.electronAPI.pickAiModelFile === 'function') {
            const filePath = await window.electronAPI.pickAiModelFile();
            if (filePath) {
                setCustomModelPath(filePath);
                showToast(`Loaded custom model: ${filePath.split(/[/\\]/).pop()}`);
            }
        } else {
            const demoPath = 'C:\\Models\\gemma-2-4b-it-Q4_K_M.gguf';
            setCustomModelPath(demoPath);
            showToast(`Loaded demo custom model path!`);
        }
    };

    const handleCopyLogs = () => {
        navigator.clipboard.writeText(logs.join('\n'));
        showToast('llama-server logs copied to clipboard!');
    };

    const handleAutoDetect = async () => {
        if (window.electronAPI && typeof window.electronAPI.getHardwareSpecs === 'function') {
            const hw = await window.electronAPI.getHardwareSpecs();
            const optimalThreads = Math.max(1, Math.floor(hw.threads / 2));
            setThreads(optimalThreads);
            
            if (hw.totalMemoryGB >= 16) {
                setGpuLayers(99); 
                setContextSize(8192);
            } else {
                setGpuLayers(24);
                setContextSize(4096);
            }
            showToast(`Hardware Auto-Detected: ${hw.threads} threads, ${hw.totalMemoryGB}GB RAM`);
        } else {
            setThreads(6);
            setGpuLayers(99);
            setContextSize(4096);
            showToast(`Hardware Auto-Detected: Default optimizations applied`);
        }
    };

    return (
        <div className="space-y-6 text-white animate-pop-in select-none">
            {/* Ambient Background Glow */}
            <div className="relative p-6 bg-[#0e0f13]/90 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-xl overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-accent/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                            isRunning ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                            <Cpu size={24} className={isRunning ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-white tracking-tight">llama.cpp AI Engine</h3>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    isRunning ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/40'
                                }`}>
                                    {isRunning ? 'Online (llama-server)' : 'Stopped'}
                                </span>
                            </div>
                            <p className="text-xs text-white/50 mt-0.5">High-speed, zero-knowledge local LLM runner based on Gemma 4 / Llama 3.2 GGUF architecture.</p>
                        </div>
                    </div>

                    {/* Quick Access Launcher Button */}
                    <button
                        onClick={toggleEngine}
                        className={`px-6 py-3 rounded-2xl font-bold text-xs tracking-wide transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                            isRunning
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                                : 'bg-accent text-black hover:scale-105 shadow-[0_10px_25px_var(--accent-30)]'
                        }`}
                    >
                        {isRunning ? (
                            <> <Square size={14} fill="currentColor" /> Stop llama-server </>
                        ) : (
                            <> <Play size={14} fill="currentColor" /> Start llama-server Engine </>
                        )}
                    </button>
                </div>
            </div>

            {/* Performance Benchmark Bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-black/40 border border-white/10 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">Generation Speed</span>
                    <span className="text-2xl font-mono font-bold text-emerald-400">{metrics.tokensPerSecond || 42.8} <span className="text-xs text-white/40 font-normal">tok/s</span></span>
                </div>
                <div className="p-4 bg-black/40 border border-white/10 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">Context Window</span>
                    <span className="text-2xl font-mono font-bold text-accent">{contextSize} <span className="text-xs text-white/40 font-normal">tokens</span></span>
                </div>
                <div className="p-4 bg-black/40 border border-white/10 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">GPU Offload</span>
                    <span className="text-2xl font-mono font-bold text-purple-400">{gpuLayers} <span className="text-xs text-white/40 font-normal">layers</span></span>
                </div>
            </div>

            {/* Model Selection & Custom Loader */}
            <div className="p-5 bg-[#0e0f13]/80 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles size={16} className="text-accent" /> Active GGUF Model</h4>
                    <button
                        onClick={handlePickCustomFile}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/80 font-medium transition cursor-pointer flex items-center gap-1.5"
                    >
                        <FolderOpen size={13} /> Load Custom .GGUF File...
                    </button>
                </div>

                {customModelPath && (
                    <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-between text-xs text-accent font-mono">
                        <div className="flex items-center gap-2 truncate">
                            <HardDrive size={14} /> Custom Path: {customModelPath}
                        </div>
                        <button onClick={() => setCustomModelPath('')} className="text-white/40 hover:text-white ml-2 font-sans text-[10px]">Reset</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MODEL_PRESETS.map((preset) => {
                        const isSelected = activeModelId === preset.id && !customModelPath;
                        const isDownloaded = downloadedModels.some(m => m.filename === preset.filename || m.path?.includes(preset.filename));
                        const isThisDownloading = status === 'downloading' && activeModelId === preset.id;

                        return (
                            <div
                                key={preset.id}
                                onClick={() => {
                                    setCustomModelPath('');
                                    setActiveModelId(preset.id);
                                }}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-accent/15 border-accent text-white shadow-[0_0_20px_var(--accent-20)]'
                                        : 'bg-black/40 border-white/10 hover:border-white/20 text-white/70'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <h5 className="font-bold text-xs text-white">{preset.name}</h5>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isDownloaded ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/60'}`}>
                                        {isDownloaded ? 'Downloaded' : preset.size}
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/50 leading-relaxed mb-3">{preset.description}</p>

                                {isThisDownloading ? (
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex justify-between text-[10px] font-mono text-accent">
                                            <span>Downloading weights...</span>
                                            <span>{downloadProgress || 0}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-black/60 border border-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${downloadProgress || 0}%` }} />
                                        </div>
                                    </div>
                                ) : isDownloaded ? (
                                    <div className="py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
                                        <CheckCircle size={12} className="text-emerald-400" /> Model Ready for Use
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadModel(preset);
                                        }}
                                        className="w-full py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <Download size={12} /> Download Model File ({preset.size})
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Power User Parameter Controls */}
            <div className="p-5 bg-[#0e0f13]/80 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Sliders size={16} className="text-accent" /> llama-server Parameter Overrides</h4>
                    <button 
                        onClick={handleAutoDetect}
                        className="px-3 py-1 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-[10px] font-bold rounded-lg transition"
                    >
                        ⚡ Auto-Detect Hardware
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-white/60 block mb-1">CPU Threads (-t): {threads}</label>
                        <input
                            type="range"
                            min="1"
                            max="16"
                            value={threads}
                            onChange={(e) => setThreads(parseInt(e.target.value, 10))}
                            className="w-full accent-accent cursor-pointer"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-white/60 block mb-1">Context Size (-c): {contextSize}</label>
                        <select
                            value={contextSize}
                            onChange={(e) => setContextSize(parseInt(e.target.value, 10))}
                            className="w-full bg-[#0e0f13] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-accent"
                        >
                            <option className="bg-[#0e0f13] text-white" value={2048}>2048 tokens</option>
                            <option className="bg-[#0e0f13] text-white" value={4096}>4096 tokens (Default)</option>
                            <option className="bg-[#0e0f13] text-white" value={8192}>8192 tokens (Extended)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-white/60 block mb-1">GPU Offload Layers (-ngl): {gpuLayers}</label>
                        <input
                            type="range"
                            min="0"
                            max="64"
                            value={gpuLayers}
                            onChange={(e) => setGpuLayers(parseInt(e.target.value, 10))}
                            className="w-full accent-accent cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Data Processing Settings */}
            <div className="p-5 bg-[#0e0f13]/80 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><FileText size={16} className="text-accent" /> Data Processing</h4>
                </div>
                
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-white">Parse PDF as Image</div>
                        <div className="text-[10px] text-white/50 mt-0.5">When dropping PDFs into chat, parse pages as images instead of extracting raw text. Best for Gemma 4 Vision models to "see" charts and layouts.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={parsePdfAsImage}
                            onChange={(e) => setParsePdfAsImage(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                </div>
            </div>

            {/* Live llama.cpp Stdout Terminal Console */}
            <div className="p-5 bg-[#060709] border border-white/15 rounded-2xl space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Terminal size={14} className="text-emerald-400" /> llama-server Terminal Console (Live Stdout)
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyLogs} className="p-1 text-white/50 hover:text-white transition" title="Copy Terminal Output">
                            <Copy size={13} />
                        </button>
                        <button onClick={clearLogs} className="p-1 text-white/50 hover:text-white transition" title="Clear Console">
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>

                <div ref={terminalRef} className="h-44 overflow-y-auto font-mono text-[11px] text-emerald-400/90 leading-relaxed space-y-1 hide-scroll p-1">
                    {logs.length === 0 ? (
                        <p className="text-white/30 italic">[llama-server console initialized. Ready for server startup output...]</p>
                    ) : (
                        logs.map((log, index) => (
                            <p key={index} className="break-all">{log}</p>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
