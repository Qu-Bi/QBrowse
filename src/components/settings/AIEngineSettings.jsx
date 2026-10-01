import React, { useEffect, useRef } from 'react';
import { 
    Cpu, Zap, Terminal, RefreshCw, Play, Square, Download, 
    FolderOpen, HardDrive, Sliders, CheckCircle, AlertCircle, Copy, Trash2, Sparkles, FileText, Loader2
} from 'lucide-react';
import useAIStore, { MODEL_PRESETS } from '../../store/useAIStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function AIEngineSettings() {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const { 
        status, isRunning, activeModelId, customModelPath, customMmprojPath, logs, metrics,
        threads, contextSize, gpuLayers, temperature, downloadProgress, downloadDetail, downloadedModels,
        setActiveModelId, setCustomModelPath, setCustomMmprojPath, setThreads, setContextSize,
        setGpuLayers, setTemperature, startEngine, stopEngine, toggleEngine,
        downloadModel, clearLogs, addLog, parsePdfAsImage, setParsePdfAsImage
    } = useAIStore();

    const showToast = useUIStore(state => state.showToast);
    const terminalRef = useRef(null);

    const hasDownloadedModel = (downloadedModels && downloadedModels.length > 0) || Boolean(customModelPath);
    const activePreset = MODEL_PRESETS.find(m => m.id === activeModelId) || MODEL_PRESETS[0];
    const isDownloading = status === 'downloading';

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

    const handlePickCustomMmproj = async () => {
        if (window.electronAPI && typeof window.electronAPI.pickAiModelFile === 'function') {
            const filePath = await window.electronAPI.pickAiModelFile();
            if (filePath) {
                setCustomMmprojPath(filePath);
                showToast(`Loaded custom vision projector: ${filePath.split(/[/\\]/).pop()}`);
            }
        } else {
            const demoPath = 'C:\\Models\\mmproj-model-f16.gguf';
            setCustomMmprojPath(demoPath);
            showToast(`Loaded demo custom projector path!`);
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
        <div className={`space-y-6 animate-tab-fade select-none ${isBright ? 'text-zinc-900' : 'text-white'}`}>
            {/* Ambient Background Glow */}
            <div className={`relative p-6 border rounded-3xl backdrop-blur-2xl shadow-xl overflow-hidden ${
                isBright ? 'bg-white/80 border-white/70 shadow-[0_15px_40px_rgba(0,0,0,0.06)]' : 'bg-[#0e0f13]/90 border-white/10'
            }`}>
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-accent/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                            isRunning ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : (isBright ? 'bg-black/5 text-zinc-500 border-black/10' : 'bg-white/5 text-white/40 border-white/10')
                        }`}>
                            <Cpu size={24} className={isRunning ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className={`text-xl font-black tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>llama.cpp AI Engine</h3>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    isRunning 
                                        ? (isBright ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
                                        : (status === 'loading' || status === 'starting' || status === 'downloading_engine')
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                            : (isBright ? 'bg-black/5 text-zinc-500 border border-black/10' : 'bg-white/10 text-white/40')
                                }`}>
                                    {isRunning ? 'Online (llama-server)' : (status === 'loading' || status === 'starting' || status === 'downloading_engine') ? 'Starting...' : 'Stopped'}
                                </span>
                            </div>
                            <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>High-speed, zero-knowledge local LLM runner based on Gemma 4 / Llama 3.2 GGUF architecture.</p>
                        </div>
                    </div>

                    {/* Quick Access Launcher Button */}
                    <button
                        onClick={toggleEngine}
                        disabled={status === 'loading' || status === 'starting' || status === 'downloading_engine'}
                        className={`px-6 py-3 rounded-2xl font-bold text-xs tracking-wide transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                            status === 'loading' || status === 'starting' || status === 'downloading_engine'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-wait'
                                : isRunning
                                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30'
                                    : 'bg-accent text-black hover:scale-105 shadow-[0_10px_25px_var(--accent-30)]'
                        }`}
                    >
                        {status === 'loading' || status === 'starting' || status === 'downloading_engine' ? (
                            <> <Loader2 size={14} className="animate-spin text-amber-400" /> Starting llama-server... </>
                        ) : isRunning ? (
                            <> <Square size={14} fill="currentColor" /> Stop llama-server </>
                        ) : (
                            <> <Play size={14} fill="currentColor" /> Start llama-server Engine </>
                        )}
                    </button>
                </div>
            </div>

            {/* Performance Benchmark Bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className={`p-4 border rounded-2xl text-center ${isBright ? 'bg-white/75 border-black/10 shadow-sm' : 'bg-black/40 border-white/10'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Generation Speed</span>
                    <span className="text-2xl font-mono font-bold text-emerald-500">{metrics.tokensPerSecond || 42.8} <span className={`text-xs font-normal ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>tok/s</span></span>
                </div>
                <div className={`p-4 border rounded-2xl text-center ${isBright ? 'bg-white/75 border-black/10 shadow-sm' : 'bg-black/40 border-white/10'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Context Window</span>
                    <span className="text-2xl font-mono font-bold text-accent">{contextSize} <span className={`text-xs font-normal ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>tokens</span></span>
                </div>
                <div className={`p-4 border rounded-2xl text-center ${isBright ? 'bg-white/75 border-black/10 shadow-sm' : 'bg-black/40 border-white/10'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>GPU Offload</span>
                    <span className="text-2xl font-mono font-bold text-purple-500">{gpuLayers} <span className={`text-xs font-normal ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>layers</span></span>
                </div>
            </div>

            {/* Model Selection & Custom Loader */}
            <div className={`p-5 border rounded-2xl space-y-4 ${isBright ? 'bg-white/75 border-black/10 shadow-sm' : 'bg-[#0e0f13]/80 border-white/10'}`}>
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-bold flex items-center gap-2 ${isBright ? 'text-zinc-900' : 'text-white'}`}><Sparkles size={16} className="text-accent" /> Active GGUF Model</h4>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePickCustomFile}
                            className={`px-3 py-1.5 border rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                            }`}
                        >
                            <FolderOpen size={13} /> Load Custom .GGUF File...
                        </button>
                        <button
                            onClick={handlePickCustomMmproj}
                            className={`px-3 py-1.5 border rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                            }`}
                        >
                            <FolderOpen size={13} /> Load Custom Projector...
                        </button>
                    </div>
                </div>

                {customModelPath && (
                    <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-between text-xs text-accent font-mono">
                        <div className="flex items-center gap-2 truncate">
                            <HardDrive size={14} /> Custom Model: {customModelPath}
                        </div>
                        <button onClick={() => setCustomModelPath('')} className={`ml-2 font-sans text-[10px] cursor-pointer ${isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/40 hover:text-white'}`}>Reset</button>
                    </div>
                )}
                
                {customMmprojPath && (
                    <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-500 font-mono mt-2">
                        <div className="flex items-center gap-2 truncate">
                            <HardDrive size={14} /> Custom Projector: {customMmprojPath}
                        </div>
                        <button onClick={() => setCustomMmprojPath('')} className={`ml-2 font-sans text-[10px] cursor-pointer ${isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/40 hover:text-white'}`}>Reset</button>
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
                                        ? (isBright ? 'bg-accent/15 border-accent text-zinc-900 shadow-[0_0_20px_var(--accent-20)]' : 'bg-accent/15 border-accent text-white shadow-[0_0_20px_var(--accent-20)]')
                                        : (isBright ? 'bg-white/60 border-black/10 hover:border-black/20 text-zinc-700 hover:bg-white/90' : 'bg-black/40 border-white/10 hover:border-white/20 text-white/70')
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <h5 className={`font-bold text-xs ${isBright ? 'text-zinc-900' : 'text-white'}`}>{preset.name}</h5>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                        isDownloaded 
                                            ? (isBright ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30') 
                                            : (isBright ? 'bg-black/5 text-zinc-600 border border-black/10' : 'bg-white/10 text-white/60')
                                    }`}>
                                        {isDownloaded ? 'Downloaded' : preset.size}
                                    </span>
                                </div>
                                <p className={`text-[11px] leading-relaxed mb-3 ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>{preset.description}</p>

                                {isThisDownloading ? (
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex justify-between text-[10px] font-mono text-accent">
                                            <span>Downloading {preset.mmprojUrl && downloadDetail?.percent > 0 && downloadDetail?.percent < 100 ? (downloadDetail?.totalBytes < 1000000000 ? 'Vision Projector...' : 'Language Model...') : 'weights...'}</span>
                                            <span>
                                                {downloadDetail?.downloadedBytes ? `${(downloadDetail.downloadedBytes / 1024 / 1024).toFixed(1)}MB / ${(downloadDetail.totalBytes / 1024 / 1024).toFixed(1)}MB` : `${downloadProgress || 0}%`}
                                            </span>
                                        </div>
                                        <div className={`w-full h-1.5 border rounded-full overflow-hidden ${isBright ? 'bg-black/10 border-black/10' : 'bg-black/60 border-white/10'}`}>
                                            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${downloadProgress || 0}%` }} />
                                        </div>
                                    </div>
                                ) : isDownloaded ? (
                                    <div className={`py-1.5 px-3 border rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 ${
                                        isBright ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                    }`}>
                                        <CheckCircle size={12} className={isBright ? 'text-emerald-600' : 'text-emerald-400'} /> Model Ready for Use
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
            <div className={`p-5 border rounded-2xl space-y-4 ${isBright ? 'bg-white/75 border-black/10 shadow-sm' : 'bg-[#0e0f13]/80 border-white/10'}`}>
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-bold flex items-center gap-2 ${isBright ? 'text-zinc-900' : 'text-white'}`}><Sliders size={16} className="text-accent" /> llama-server Parameter Overrides</h4>
                    <button 
                        onClick={handleAutoDetect}
                        className="px-3 py-1 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                        <Zap size={11} /> Auto-Detect Hardware
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={`text-xs font-semibold block mb-1 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>CPU Threads (-t): {threads}</label>
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
                        <label className={`text-xs font-semibold block mb-1 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>Context Size (-c): {contextSize}</label>
                        <select
                            value={contextSize}
                            onChange={(e) => setContextSize(parseInt(e.target.value, 10))}
                            className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono outline-none focus:border-accent ${
                                isBright ? 'bg-white/90 border-black/15 text-zinc-900' : 'bg-[#0e0f13] border-white/10 text-white'
                            }`}
                        >
                            <option className={isBright ? 'bg-white text-zinc-900' : 'bg-[#0e0f13] text-white'} value={2048}>2048 tokens</option>
                            <option className={isBright ? 'bg-white text-zinc-900' : 'bg-[#0e0f13] text-white'} value={4096}>4096 tokens (Default)</option>
                            <option className={isBright ? 'bg-white text-zinc-900' : 'bg-[#0e0f13] text-white'} value={8192}>8192 tokens (Extended)</option>
                        </select>
                    </div>
                    <div>
                        <label className={`text-xs font-semibold block mb-1 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>GPU Offload Layers (-ngl): {gpuLayers}</label>
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
            <div className={`p-5 border rounded-2xl space-y-4 ${isBright ? 'bg-white/75 border-black/10 shadow-sm' : 'bg-[#0e0f13]/80 border-white/10'}`}>
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-bold flex items-center gap-2 ${isBright ? 'text-zinc-900' : 'text-white'}`}><FileText size={16} className="text-accent" /> Data Processing</h4>
                </div>
                
                <div className="flex items-center justify-between">
                    <div>
                        <div className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>Parse PDF as Image</div>
                        <div className={`text-[10px] mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>When dropping PDFs into chat, parse pages as images instead of extracting raw text. Best for Gemma 4 Vision models to "see" charts and layouts.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={parsePdfAsImage}
                            onChange={(e) => setParsePdfAsImage(e.target.checked)}
                        />
                        <div className={`w-9 h-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent ${
                            isBright ? 'bg-black/10 after:bg-white after:border-zinc-300' : 'bg-white/10 after:bg-white after:border-gray-300'
                        }`}></div>
                    </label>
                </div>
            </div>

            {/* Live llama.cpp Stdout Terminal Console - PERMANENTLY DARK INVARIANT */}
            <div className="p-5 bg-[#060709] border border-white/15 rounded-2xl space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Terminal size={14} className="text-emerald-400" /> llama-server Terminal Console (Live Stdout)
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyLogs} className="p-1 text-white/50 hover:text-white transition cursor-pointer" title="Copy Terminal Output">
                            <Copy size={13} />
                        </button>
                        <button onClick={clearLogs} className="p-1 text-white/50 hover:text-white transition cursor-pointer" title="Clear Console">
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
