import React, { useState } from 'react';
import { Pin, X, Globe, Plus, Sparkles } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

const PRESET_APPS = [
    { name: 'GitHub', domain: 'github.com' },
    { name: 'YouTube', domain: 'youtube.com' },
    { name: 'ChatGPT', domain: 'chatgpt.com' },
    { name: 'X / Twitter', domain: 'x.com' },
    { name: 'Figma', domain: 'figma.com' },
    { name: 'Spotify', domain: 'spotify.com' },
    { name: 'Discord', domain: 'discord.com' },
    { name: 'Reddit', domain: 'reddit.com' },
    { name: 'Netflix', domain: 'netflix.com' },
    { name: 'Stack Overflow', domain: 'stackoverflow.com' }
];

export default function AddPinModal() {
    const { activeModal, isModalClosing, closingModal, closeModal } = useUIStore();
    const addPinnedTab = useTabStore(state => state.addPinnedTab);

    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');

    const isClosingThis = isModalClosing && closingModal === 'addPin';
    if (activeModal !== 'addPin' && !isClosingThis) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!url.trim()) return;

        addPinnedTab(title.trim() || url.trim(), url.trim());
        setTitle('');
        setUrl('');
        closeModal();
    };

    const handleSelectPreset = (preset) => {
        setTitle(preset.name);
        setUrl(preset.domain);
    };

    const cleanDomain = url.trim().replace(/^https?:\/\//i, '').split('/')[0];

    return (
        <div 
            className={`fixed inset-0 z-[50000] flex items-center justify-center bg-black/75 backdrop-blur-2xl text-white font-sans p-4 ${isModalClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={closeModal}
        >
            <div 
                className={`w-full max-w-md bg-[#0d0d11]/95 border border-white/12 rounded-3xl p-6 shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex flex-col gap-6 relative ${isModalClosing ? 'animate-modal-spring-out' : 'animate-modal-spring'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-accent-10 border border-accent-30 text-accent flex items-center justify-center shadow-lg shadow-accent/10">
                            <Pin size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Pin App to Sidebar</h2>
                            <p className="text-xs text-white/50">Add a quick access app or website shortcut</p>
                        </div>
                    </div>
                    <button 
                        onClick={closeModal} 
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition cursor-pointer"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Live Preview Card */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {cleanDomain ? (
                                <img 
                                    src={`https://www.google.com/s2/favicons?sz=64&domain=${cleanDomain}`} 
                                    alt="favicon" 
                                    className="w-6 h-6 rounded-md"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <Globe size={20} className="text-white/30" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{title.trim() || cleanDomain || 'App Name'}</p>
                            <p className="text-[10px] font-mono text-white/40 truncate">{cleanDomain || 'domain.com'}</p>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 block">
                                App Name / Title
                            </label>
                            <input 
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. GitHub, ChatGPT..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent transition"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 block">
                                URL / Domain *
                            </label>
                            <input 
                                type="text"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder="e.g. github.com or https://chatgpt.com"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent transition font-mono"
                                required
                            />
                        </div>
                    </div>

                    {/* Presets Grid */}
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 block flex items-center gap-1">
                            <Sparkles size={10} className="text-accent" /> Quick Presets
                        </span>
                        <div className="grid grid-cols-5 gap-1.5">
                            {PRESET_APPS.map(preset => (
                                <button
                                    key={preset.domain}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset)}
                                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl flex flex-col items-center gap-1 transition group cursor-pointer"
                                    title={preset.name}
                                >
                                    <img 
                                        src={`https://www.google.com/s2/favicons?sz=64&domain=${preset.domain}`} 
                                        alt={preset.name}
                                        className="w-5 h-5 rounded-md group-hover:scale-110 transition" 
                                    />
                                    <span className="text-[9px] text-white/60 group-hover:text-white truncate w-full text-center">{preset.name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-white/5">
                        <button 
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!url.trim()}
                            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-black font-bold rounded-xl text-xs shadow-lg shadow-accent/20 transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus size={14} /> Pin App
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
