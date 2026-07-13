import React from 'react';
import { Palette, Shield, Cpu, ShieldAlert, Search, Download, X, ShieldCheck } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

const SettingsModal = () => {
    const { 
        activeModal, 
        isModalClosing, 
        closeModal,
        settingsTab, 
        setSettingsTab,
        isForceDark, 
        setIsForceDark,
        isGlassEnabled, 
        setIsGlassEnabled,
        isSwipeEnabled, 
        setIsSwipeEnabled,
        mockSettings, 
        toggleMockSetting,
        accentColor, 
        setAccentColor
    } = useUIStore();

    if (activeModal !== 'settings' && !isModalClosing) return null;

    return (
        <div className={`fixed inset-0 z-[200] flex bg-black/60 backdrop-blur-3xl text-white font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-modal'}`}>
            <div className="w-64 border-r border-white/10 flex flex-col bg-black/40">
                <div className="p-6 pb-2">
                    <h2 className="text-xl font-bold tracking-tight">Settings</h2>
                </div>
                <div className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto hide-scroll">
                    <button onClick={() => setSettingsTab('appearance')} className={`flex items-center gap-3 p-3 rounded-xl transition ${settingsTab === 'appearance' ? 'bg-accent-20 text-accent border border-accent-30' : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'}`}>
                        <Palette size={16} /> <span className="text-sm font-medium">Appearance & UX</span>
                    </button>
                    <button onClick={() => setSettingsTab('privacy')} className={`flex items-center gap-3 p-3 rounded-xl transition ${settingsTab === 'privacy' ? 'bg-accent-20 text-accent border border-accent-30' : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'}`}>
                        <Shield size={16} /> <span className="text-sm font-medium">Privacy & Security</span>
                    </button>
                    <button onClick={() => setSettingsTab('engine')} className={`flex items-center gap-3 p-3 rounded-xl transition ${settingsTab === 'engine' ? 'bg-accent-20 text-accent border border-accent-30' : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'}`}>
                        <Cpu size={16} /> <span className="text-sm font-medium">Engine (Tauri)</span>
                    </button>
                    <button onClick={() => setSettingsTab('adblock')} className={`flex items-center gap-3 p-3 rounded-xl transition ${settingsTab === 'adblock' ? 'bg-accent-20 text-accent border border-accent-30' : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'}`}>
                        <ShieldAlert size={16} /> <span className="text-sm font-medium">Native AdBlocker</span>
                    </button>
                    <button onClick={() => setSettingsTab('search')} className={`flex items-center gap-3 p-3 rounded-xl transition ${settingsTab === 'search' ? 'bg-accent-20 text-accent border border-accent-30' : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'}`}>
                        <Search size={16} /> <span className="text-sm font-medium">Search & Omnibox</span>
                    </button>
                    <button onClick={() => setSettingsTab('downloads')} className={`flex items-center gap-3 p-3 rounded-xl transition ${settingsTab === 'downloads' ? 'bg-accent-20 text-accent border border-accent-30' : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'}`}>
                        <Download size={16} /> <span className="text-sm font-medium">Downloads & Multitasking</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 p-10 relative overflow-y-auto">
                <button onClick={closeModal} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"><X size={16} /></button>

                <div className="max-w-2xl">
                    {settingsTab === 'appearance' && (
                        <div className="animate-pop-in">
                            <h3 className="text-2xl font-bold mb-6">Appearance & UX</h3>

                            <div className="mb-8">
                                <span className="text-xs font-bold uppercase text-white/40 tracking-wider mb-4 block">Magic Accent Color</span>
                                <div className="flex gap-4 items-center">
                                    {[
                                        { hex: '#d4bc94', name: 'Sand' },
                                        { hex: '#3b82f6', name: 'Ocean' },
                                        { hex: '#10b981', name: 'Emerald' },
                                        { hex: '#8b5cf6', name: 'Amethyst' },
                                        { hex: '#f43f5e', name: 'Rose' }
                                    ].map((c) => (
                                        <button
                                            key={c.hex}
                                            onClick={() => setAccentColor(c.hex)}
                                            className={`w-8 h-8 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center ${accentColor === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110' : ''}`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.name}
                                        >
                                            {accentColor === c.hex && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </button>
                                    ))}
                                    <div className="w-px h-6 bg-white/20 mx-2"></div>

                                    <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-colors focus-within:border-accent">
                                        <div className="pl-3 pr-2 py-2 border-r border-white/10">
                                            <Palette size={14} className="text-white/40" />
                                        </div>
                                        <span className="pl-2 text-xs text-white/40 font-mono">#</span>
                                        <input
                                            type="text"
                                            value={accentColor.replace('#', '')}
                                            onChange={(e) => {
                                                const val = e.target.value.replace('#', '');
                                                if (val.length <= 6) setAccentColor('#' + val);
                                            }}
                                            className="w-16 bg-transparent border-none text-xs text-white font-mono outline-none py-2 uppercase"
                                            maxLength={6}
                                        />
                                    </div>

                                </div>
                                <p className="text-xs text-white/40 mt-3">Change the accent color to instantly rewrite all Glassmorphism colors (shadows, highlights, active states).</p>
                            </div>

                            <div className="mb-8 space-y-4">
                                <span className="text-xs font-bold uppercase text-white/40 tracking-wider mb-2 block">Interface Options</span>

                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Force Dark Mode (Web & UI)</p>
                                        <p className="text-xs text-white/40 mt-0.5">Force websites and interface to use a dark theme.</p>
                                    </div>
                                    <button onClick={() => setIsForceDark(!isForceDark)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${isForceDark ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isForceDark ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">UI Transparency (Glassmorphism)</p>
                                        <p className="text-xs text-white/40 mt-0.5">Disable backdrop-blur effects for weaker GPUs.</p>
                                    </div>
                                    <button onClick={() => setIsGlassEnabled(!isGlassEnabled)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${isGlassEnabled ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isGlassEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Space Animations</p>
                                        <p className="text-xs text-white/40 mt-0.5">Physical screen swipe when switching workspaces.</p>
                                    </div>
                                    <button onClick={() => setIsSwipeEnabled(!isSwipeEnabled)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${isSwipeEnabled ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isSwipeEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsTab === 'privacy' && (
                        <div className="animate-pop-in">
                            <h3 className="text-2xl font-bold mb-6">Privacy & Security</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">HTTPS-Only Mode</p>
                                        <p className="text-xs text-white/40 mt-0.5">Automatically upgrade all connections to secure HTTPS.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('httpsOnly')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.httpsOnly ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.httpsOnly ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Strict Site Isolation</p>
                                        <p className="text-xs text-white/40 mt-0.5">Run each site in its own Tauri process (uses more RAM).</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('isolation')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.isolation ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.isolation ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">WebRTC Leak Protection</p>
                                        <p className="text-xs text-white/40 mt-0.5">Prevent sites from discovering your true IP address.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('webrtc')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.webrtc ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.webrtc ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <p className="font-semibold text-sm mb-3">Secure DNS (DoH)</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button className="py-2 px-4 bg-accent-20 border border-accent-30 text-accent rounded-xl text-sm font-semibold">Cloudflare</button>
                                        <button className="py-2 px-4 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm font-semibold transition">Google</button>
                                        <button className="py-2 px-4 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm font-semibold transition">Custom</button>
                                    </div>
                                </div>
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between mt-4">
                                    <div>
                                        <p className="font-semibold text-sm text-red-400">Clear Browsing Data</p>
                                        <p className="text-xs text-red-400/60 mt-0.5">Clear history, cookies, and cache from local SQLite.</p>
                                    </div>
                                    <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-sm transition">Clear Data...</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsTab === 'engine' && (
                        <div className="animate-pop-in">
                            <h3 className="text-2xl font-bold mb-6">Engine (Tauri)</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Hardware Acceleration (GPU)</p>
                                        <p className="text-xs text-white/40 mt-0.5">Use GPU to render complex web pages and animations.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('hardware')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.hardware ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.hardware ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Memory Saver</p>
                                        <p className="text-xs text-white/40 mt-0.5">Suspend background tabs to save RAM.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('memory')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.memory ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.memory ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Smooth Scrolling</p>
                                        <p className="text-xs text-white/40 mt-0.5">Enable physical-like momentum scrolling on web pages.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('smooth')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.smooth ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.smooth ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Battery Saver Mode</p>
                                        <p className="text-xs text-white/40 mt-0.5">Limit JS framerate and animations when below 20% battery.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('battery')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.battery ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.battery ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsTab === 'adblock' && (
                        <div className="animate-pop-in">
                            <h3 className="text-2xl font-bold mb-6">Native AdBlocker</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Cosmetic Filtering</p>
                                        <p className="text-xs text-white/40 mt-0.5">Inject CSS to hide empty spaces left by blocked ads.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('cosmetic')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.cosmetic ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.cosmetic ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Block Social Trackers</p>
                                        <p className="text-xs text-white/40 mt-0.5">Prevent Facebook, X, and TikTok from tracking you.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('social')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.social ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.social ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-semibold text-sm">Active Filter Lists</p>
                                        <button className="text-xs text-accent hover:underline">Update Now</button>
                                    </div>
                                    <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center justify-between text-sm text-white/80">
                                            <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-400" /> EasyList (Default)</div>
                                            <span className="text-[10px] font-mono text-white/40">114,203 rules</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-white/80">
                                            <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-400" /> EasyPrivacy</div>
                                            <span className="text-[10px] font-mono text-white/40">28,910 rules</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-white/80">
                                            <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-400" /> uBlock Annoyances</div>
                                            <span className="text-[10px] font-mono text-white/40">8,451 rules</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsTab === 'search' && (
                        <div className="animate-pop-in">
                            <h3 className="text-2xl font-bold mb-6">Search & Omnibox</h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <p className="font-semibold text-sm mb-3">Default Search Engine</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button className="py-2 px-4 bg-accent-20 border border-accent-30 text-accent rounded-xl text-sm font-semibold">Google</button>
                                        <button className="py-2 px-4 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm font-semibold transition">DuckDuckGo</button>
                                        <button className="py-2 px-4 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm font-semibold transition">Bing</button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Smart Calculator</p>
                                        <p className="text-xs text-white/40 mt-0.5">Solve math equations directly in the Omnibox.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('smartCalc')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.smartCalc ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.smartCalc ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Live Search Suggestions</p>
                                        <p className="text-xs text-white/40 mt-0.5">Send typed queries to your search engine for live autocomplete.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('liveSearch')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.liveSearch ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.liveSearch ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsTab === 'downloads' && (
                        <div className="animate-pop-in">
                            <h3 className="text-2xl font-bold mb-6">Downloads & Multitasking</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Ask where to save each file</p>
                                        <p className="text-xs text-white/40 mt-0.5">Instead of saving automatically to Downloads folder.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('askSave')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.askSave ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.askSave ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Default Location</p>
                                        <p className="text-xs text-accent mt-0.5 font-mono">/Users/qbrowse/Downloads</p>
                                    </div>
                                    <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition">Change...</button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="font-semibold text-sm">Group by Extension</p>
                                        <p className="text-xs text-white/40 mt-0.5">Automatically organize files into Images, Documents, etc.</p>
                                    </div>
                                    <button onClick={() => toggleMockSetting('groupDownloads')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${mockSettings.groupDownloads ? 'bg-accent' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${mockSettings.groupDownloads ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
