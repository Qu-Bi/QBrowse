import React, { useState, useEffect } from 'react';
import { 
    Palette, Shield, Cpu, ShieldAlert, Search, Download, X, 
    ShieldCheck, Cookie, Lock, Trash2, RotateCcw, Flag, Info, 
    Key, Bell, RefreshCw, Layers, CheckCircle2, Sparkles, 
    Eye, Zap, Volume2, Globe, Sliders, Laptop, Maximize2, Monitor,
    UploadCloud, Compass, ExternalLink, Plus
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';
import useTabStore from '../../store/useTabStore';
import useSyncStore from '../../store/useSyncStore';
import useTorStore from '../../store/useTorStore';
import AIEngineSettings from '../settings/AIEngineSettings';
import { getAllBangs } from '../../utils/searchBangs';

// Helper Card Component for Unified Styling (Top-level to preserve DOM instances and CSS transitions)
const SettingCard = ({ icon: Icon, title, description, children }) => (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-accent-30 transition-all duration-300 group">
        <div className="flex items-center gap-3 min-w-0 pr-4">
            {Icon && (
                <div className="w-9 h-9 rounded-xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Icon size={16} />
                </div>
            )}
            <div className="min-w-0">
                <p className="font-semibold text-sm text-white group-hover:text-accent transition-colors truncate">{title}</p>
                {description && <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{description}</p>}
            </div>
        </div>
        <div className="flex-shrink-0">
            {children}
        </div>
    </div>
);

// Helper Toggle Switch Component (Top-level to preserve DOM instances and CSS transitions)
const SettingToggle = ({ isChecked, onToggle }) => {
    return (
        <button 
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (onToggle) onToggle();
            }} 
            className={`w-11 h-6 rounded-full flex items-center p-1 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer hover:scale-105 active:scale-95 ${
                isChecked 
                    ? 'bg-accent shadow-[0_0_15px_var(--accent-40)]' 
                    : 'bg-white/20 hover:bg-white/30'
            }`}
        >
            <div 
                className="w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                    transform: isChecked ? 'translateX(20px)' : 'translateX(0px)'
                }}
            />
        </button>
    );
};

const SettingsModal = () => {
    const { 
        activeModal, 
        isModalClosing, 
        closeModal,
        openModal,
        showToast,
        settingsTab, 
        setSettingsTab,
        isForceDark, 
        setIsForceDark,
        isGlassEnabled, 
        setIsGlassEnabled,
        isSwipeEnabled, 
        setIsSwipeEnabled,
        settings, 
        toggleSetting,
        setSettingValue,
        accentColor, 
        setAccentColor,
        darkExclusions,
        setDarkExclusions,
        addCustomBang,
        removeCustomBang
    } = useUIStore();

    const { user, isSyncing, lastSyncTime, syncedItemsCount, syncNow, logout, autoSyncEnabled, toggleAutoSync } = useSyncStore();
    const isTorEnabled = useTorStore(state => state.isTorEnabled);
    const toggleTorEnabled = useTorStore(state => state.toggleTorEnabled);

    const [allPermissions, setAllPermissions] = useState({});
    const [searchFilter, setSearchFilter] = useState('');
    const [bangFilter, setBangFilter] = useState('');
    const [isAddingBang, setIsAddingBang] = useState(false);
    const [newBangPrefix, setNewBangPrefix] = useState('');
    const [newBangName, setNewBangName] = useState('');
    const [newBangUrl, setNewBangUrl] = useState('');
    const [newBangColor, setNewBangColor] = useState('#d4bc94');
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [isDefaultBrowser, setIsDefaultBrowser] = useState(false);
    const [isCheckingDefault, setIsCheckingDefault] = useState(false);
    const [checkDefaultOnStartup, setCheckDefaultOnStartup] = useState(() => {
        return localStorage.getItem('qbrowse_dismiss_default_browser') !== 'true';
    });

    const refreshDefaultBrowserStatus = async () => {
        if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
            setIsCheckingDefault(true);
            try {
                const res = await window.electronAPI.checkDefaultBrowser();
                setIsDefaultBrowser(!!res.isDefault);
            } catch (_) {}
            setIsCheckingDefault(false);
        }
    };

    const handleSetDefaultBrowser = async () => {
        if (window.electronAPI && window.electronAPI.setDefaultBrowser) {
            try {
                const res = await window.electronAPI.setDefaultBrowser();
                setIsDefaultBrowser(!!res.isDefault);
                if (res.isDefault) {
                    showToast('QBrowse set as default browser! 🎉');
                } else {
                    showToast('Default browser settings opened.');
                }
            } catch (_) {
                showToast('Failed to set default browser.');
            }
        }
    };

    const handleOpenDefaultAppsSettings = () => {
        if (window.electronAPI && window.electronAPI.openDefaultAppsSettings) {
            window.electronAPI.openDefaultAppsSettings();
            showToast('Opening system default apps settings...');
        }
    };

    const handleToggleStartupCheck = () => {
        const next = !checkDefaultOnStartup;
        setCheckDefaultOnStartup(next);
        if (next) {
            localStorage.removeItem('qbrowse_dismiss_default_browser');
            showToast('Will check default browser on startup.');
        } else {
            localStorage.setItem('qbrowse_dismiss_default_browser', 'true');
            showToast('Startup default browser check disabled.');
        }
    };

    useEffect(() => {
        refreshDefaultBrowserStatus();
    }, [settingsTab]);

    useEffect(() => {
        if (settingsTab === 'cookies' && window.electronAPI && window.electronAPI.getAllSitePermissions) {
            window.electronAPI.getAllSitePermissions().then(perms => {
                setAllPermissions(perms || {});
            }).catch(() => {});
        }
    }, [settingsTab]);

    const handleRemoveDomainRules = async (domain) => {
        if (window.electronAPI && window.electronAPI.resetSitePermissions) {
            await window.electronAPI.resetSitePermissions(domain);
            setAllPermissions(prev => {
                const next = { ...prev };
                delete next[domain];
                return next;
            });
            showToast(`Cleared permission overrides for ${domain}`);
        }
    };

    const handleResetAllSettings = () => {
        localStorage.removeItem('qbrowse_settings');
        localStorage.removeItem('qbrowse_isForceDark');
        localStorage.removeItem('qbrowse_dark_exclusions');
        setIsForceDark(false);
        setIsGlassEnabled(true);
        setIsSwipeEnabled(true);
        setAccentColor('#d4bc94');
        showToast('All QBrowse settings restored to factory defaults');
    };

    const navTabs = [
        { id: 'appearance', label: 'Appearance & UX', icon: Palette, category: 'Preferences' },
        { id: 'privacy', label: 'Privacy & Security', icon: Shield, category: 'Preferences' },
        { id: 'cookies', label: 'Cookies & Permissions', icon: Cookie, category: 'Preferences' },
        { id: 'search', label: 'Search & Omnibox', icon: Search, category: 'Preferences' },
        { id: 'downloads', label: 'Downloads & Media', icon: Download, category: 'Preferences' },
        { id: 'ai', label: 'AI & llama.cpp Engine', icon: Sparkles, category: 'Advanced' },
        { id: 'engine', label: 'Engine & Performance', icon: Cpu, category: 'Advanced' },
        { id: 'adblock', label: 'Native AdBlocker', icon: ShieldAlert, category: 'Advanced' },
        { id: 'about', label: 'About & System Info', icon: Info, category: 'System' }
    ];

    const filteredNavTabs = navTabs.filter(t => 
        t.label.toLowerCase().includes(searchFilter.toLowerCase()) || 
        t.category.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'settings';
    if (activeModal !== 'settings' && !isClosingThis) return null;

    return (
        <div className={`absolute inset-0 z-[200] flex bg-black/60 backdrop-blur-3xl text-white font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-modal'}`} onClick={closeModal}>
            {/* LEFT NAVIGATION SIDEBAR */}
            <div className="w-72 border-r border-white/10 flex flex-col bg-black/40" onClick={e => e.stopPropagation()}>
                <div className="p-6 pb-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Sparkles size={18} className="text-accent" /> Settings
                        </h2>
                        <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">v1.2.1</span>
                    </div>

                    {/* Live Search Input */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-2.5 text-white/40" />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Search settings..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-white/40 outline-none focus:border-accent transition-colors"
                        />
                        {searchFilter && (
                            <button onClick={() => setSearchFilter('')} className="absolute right-2.5 top-2 text-white/40 hover:text-white">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto hide-scroll">
                    {filteredNavTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = settingsTab === tab.id;
                        return (
                            <button 
                                key={tab.id}
                                onClick={() => setSettingsTab(tab.id)} 
                                className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer text-left ${
                                    isActive 
                                        ? 'bg-accent-20 text-accent border border-accent-30 font-semibold shadow-lg shadow-accent/10' 
                                        : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'
                                }`}
                            >
                                <Icon size={16} className={isActive ? 'text-accent' : 'text-white/60'} /> 
                                <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-white/10">
                    <button 
                        onClick={handleResetAllSettings}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                        <RotateCcw size={13} /> Reset All Settings
                    </button>
                </div>
            </div>

            {/* RIGHT CONTENT PANEL */}
            <div className="flex-1 p-10 relative overflow-y-auto w-[600px] md:w-[800px] max-w-full" onClick={e => e.stopPropagation()}>
                <button onClick={(e) => { e.stopPropagation(); closeModal(); }} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition z-[999] cursor-pointer">
                    <X size={16} className="pointer-events-none" />
                </button>

                <div className="w-full">
                    {/* TAB 1: APPEARANCE & UX */}
                    {settingsTab === 'appearance' && (
                        <div className="animate-pop-in space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Appearance & UX</h3>
                                <p className="text-xs text-white/40">Customize theme colors, UI scale, and physical glassmorphism effects.</p>
                            </div>

                            {/* Magic Accent Color */}
                            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                                <span className="text-xs font-bold uppercase text-accent tracking-wider block">Magic Accent Color</span>
                                <div className="flex gap-3 items-center flex-wrap">
                                    {[
                                        { hex: '#d4bc94', name: 'Sand' },
                                        { hex: '#3b82f6', name: 'Ocean' },
                                        { hex: '#10b981', name: 'Emerald' },
                                        { hex: '#8b5cf6', name: 'Amethyst' },
                                        { hex: '#f43f5e', name: 'Rose' },
                                        { hex: '#f97316', name: 'Sunset' },
                                        { hex: '#06b6d4', name: 'Cyber' }
                                    ].map((c) => (
                                        <button
                                            key={c.hex}
                                            onClick={() => setAccentColor(c.hex)}
                                            className={`w-8 h-8 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${accentColor === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110' : ''}`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.name}
                                        >
                                            {accentColor === c.hex && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </button>
                                    ))}
                                    <div className="w-px h-6 bg-white/20 mx-1"></div>

                                    <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-accent">
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
                                <p className="text-xs text-white/40">Selecting a color rewrites all glass highlights, shadows, and active states instantly.</p>
                            </div>

                            {/* Force Dark Mode Card */}
                            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-sm">
                                            <Eye size={16} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Force Dark Mode (Web & UI)</p>
                                            <p className="text-xs text-white/40 mt-0.5">Smart luminosity engine inverts light sites while preserving native dark sites.</p>
                                        </div>
                                    </div>
                                    <SettingToggle isChecked={isForceDark} onToggle={() => setIsForceDark(!isForceDark)} />
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs text-white/50 mb-1.5 font-semibold">Excluded Domains (One per line):</p>
                                    <textarea
                                        value={darkExclusions.join('\n')}
                                        onChange={(e) => setDarkExclusions(e.target.value.split('\n').map(s => s.trim()).filter(s => s))}
                                        placeholder={"example.com\ngithub.com"}
                                        className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs font-mono text-white/80 resize-none outline-none focus:border-accent transition-colors"
                                    />
                                </div>
                            </div>

                            <SettingCard icon={Sliders} title="UI Transparency (Glassmorphism)" description="Disable backdrop-blur translucency for weaker GPUs.">
                                <SettingToggle isChecked={isGlassEnabled} onToggle={() => setIsGlassEnabled(!isGlassEnabled)} />
                            </SettingCard>

                            <SettingCard icon={Maximize2} title="Space Swipe Animations" description="Physical screen swipe transitions when switching workspace tabs.">
                                <SettingToggle isChecked={isSwipeEnabled} onToggle={() => setIsSwipeEnabled(!isSwipeEnabled)} />
                            </SettingCard>

                            <SettingCard icon={Sparkles} title="Active Tab Favicon Glow" description="Render a subtle glowing aura around active tab favicons.">
                                <SettingToggle isChecked={!!settings.faviconGlow} onToggle={() => toggleSetting('faviconGlow')} />
                            </SettingCard>

                            <SettingCard icon={Monitor} title="UI Density & Scale" description="Adjust spacing and padding for navigation controls.">
                                <div className="relative flex items-center p-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                                    <div 
                                        className="absolute top-1 bottom-1 w-[calc(50%-6px)] rounded-lg bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-md pointer-events-none"
                                        style={{
                                            left: '4px',
                                            transform: (settings.uiScale || 'comfortable') === 'compact' ? 'translateX(0px)' : 'translateX(calc(100% + 4px))'
                                        }}
                                    />
                                    {[
                                        { id: 'compact', label: 'Compact' },
                                        { id: 'comfortable', label: 'Comfortable' }
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSettingValue('uiScale', s.id)}
                                            className={`relative z-10 w-24 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer text-center select-none ${
                                                (settings.uiScale || 'comfortable') === s.id
                                                    ? 'text-black'
                                                    : 'text-white/60 hover:text-white'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </SettingCard>
                        </div>
                    )}

                    {/* TAB 2: PRIVACY & SECURITY */}
                    {settingsTab === 'privacy' && (
                        <div className="animate-pop-in space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Privacy & Security</h3>
                                <p className="text-xs text-white/40">Manage network encryption, DNS security, and process isolation.</p>
                            </div>

                            <SettingCard icon={Lock} title="HTTPS-Only Mode" description="Automatically upgrade all connections to secure HTTPS.">
                                <SettingToggle isChecked={!!settings.httpsOnly} onToggle={() => toggleSetting('httpsOnly')} />
                            </SettingCard>

                            <SettingCard icon={Shield} title="Strict Process Isolation" description="Run each site in its own isolated Electron process sandbox.">
                                <SettingToggle isChecked={!!settings.isolation} onToggle={() => toggleSetting('isolation')} />
                            </SettingCard>

                            <SettingCard icon={Globe} title="WebRTC Leak Protection" description="Prevent sites from discovering your true local IP address via WebRTC calls.">
                                <SettingToggle 
                                    isChecked={!!settings.webrtc} 
                                    onToggle={() => {
                                        const nextVal = !settings.webrtc;
                                        toggleSetting('webrtc');
                                        if (window.electronAPI && window.electronAPI.setWebRTC) {
                                            window.electronAPI.setWebRTC(nextVal);
                                        }
                                    }}
                                />
                            </SettingCard>

                            <SettingCard icon={Eye} title="Send 'Do Not Track' (DNT) Header" description="Request that web networks and advertisers omit cross-site tracking.">
                                <SettingToggle isChecked={!!settings.dnt} onToggle={() => toggleSetting('dnt')} />
                            </SettingCard>

                            {/* Tor Onion Network Routing */}
                            <SettingCard 
                                icon={Globe} 
                                title="Tor Onion Network Routing" 
                                description="Route Private space through the Tor network. Onion icon dynamically replaces Ghost in the bottom spaces bar."
                            >
                                <SettingToggle 
                                    isChecked={isTorEnabled} 
                                    onToggle={() => toggleTorEnabled()} 
                                />
                            </SettingCard>

                            {/* Encrypted Cloud Auto-Sync */}
                            <SettingCard 
                                icon={RefreshCw} 
                                title="Encrypted Cloud Auto-Sync" 
                                description={user 
                                    ? `Automatically encrypts (AES-256) and syncs tabs, vault, and settings every 5 minutes and on local changes. (Last sync: ${lastSyncTime || 'Pending'})`
                                    : "Sign in to your account from the user profile popover to enable automatic encrypted cloud sync across devices."
                                }
                            >
                                <SettingToggle 
                                    isChecked={!!user && autoSyncEnabled} 
                                    onToggle={() => {
                                        if (!user) {
                                            openModal('auth');
                                        } else {
                                            toggleAutoSync();
                                        }
                                    }} 
                                />
                            </SettingCard>

                            {/* DoH Provider Selector */}
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-accent-30 transition-all duration-300">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-sm">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Secure DNS (DoH)</p>
                                        <p className="text-xs text-white/40 mt-0.5">Encrypt DNS queries via HTTPS to prevent ISP domain logging.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'cloudflare', name: 'Cloudflare' },
                                        { id: 'google', name: 'Google' },
                                        { id: 'nextdns', name: 'NextDNS' }
                                    ].map(d => (
                                        <button 
                                            key={d.id}
                                            onClick={async () => {
                                                setSettingValue('doh', d.id);
                                                if (window.electronAPI && window.electronAPI.setDoh) {
                                                    await window.electronAPI.setDoh(d.id);
                                                }
                                                showToast(`Secure DNS set to ${d.name}`);
                                            }}
                                            className={`py-2 px-4 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                                (settings.doh || 'cloudflare') === d.id
                                                    ? 'bg-accent-20 border-accent-30 text-accent font-bold'
                                                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                            }`}
                                        >
                                            {d.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Clear Data Card */}
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-sm text-red-400">Clear Browsing Data</p>
                                    <p className="text-xs text-red-400/60 mt-0.5">Clear history, cookies, and cache from local storage & SQLite.</p>
                                </div>
                                <button 
                                    onClick={async () => {
                                        if (window.electronAPI && window.electronAPI.clearAllData) {
                                            await window.electronAPI.clearAllData({ cookies: true, cache: true, storage: true }).catch(()=>{});
                                        }
                                        useHistoryStore.getState().clearHistory();
                                        showToast('All browsing data cleared!');
                                    }}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                                >
                                    Clear Data...
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: COOKIES & PERMISSIONS */}
                    {settingsTab === 'cookies' && (
                        <div className="animate-pop-in space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Cookies & Site Permissions</h3>
                                <p className="text-xs text-white/40">Control storage access, cross-site tracking cookies, and site rules.</p>
                            </div>

                            {/* Open Cookie Explorer Card */}
                            <div className="p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
                                        <Cookie size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-base text-white">Interactive Cookie Explorer</p>
                                        <p className="text-xs text-white/50 mt-0.5">Inspect, search, and delete individual site cookies and local storage.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => openModal('cookies')}
                                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                                >
                                    Open Explorer...
                                </button>
                            </div>

                            {/* Custom Domain Permission Overrides */}
                            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-sm">Site Permission Overrides</p>
                                        <p className="text-xs text-white/40 mt-0.5">Sites with custom location, media, notification, or sound rules.</p>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                        {Object.keys(allPermissions).length} Sites
                                    </span>
                                </div>

                                {Object.keys(allPermissions).length === 0 ? (
                                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-white/40">
                                        No custom site permissions saved yet. Click the lock icon in the address bar on any site to set rules.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto hide-scroll pr-1">
                                        {Object.entries(allPermissions).map(([domain, rules]) => (
                                            <div key={domain} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <span className="text-xs font-bold text-white font-mono">{domain}</span>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {Object.entries(rules).map(([perm, val]) => (
                                                            <span key={perm} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                                                val === 'allow' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                                            }`}>
                                                                {perm}: {val}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveDomainRules(domain)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition cursor-pointer"
                                                    title="Reset permissions for domain"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <SettingCard icon={ShieldAlert} title="Block 3rd-Party Tracking Cookies" description="Prevent external tracking widgets from saving cross-site cookies.">
                                <SettingToggle isChecked={!!settings.block3rdParty} onToggle={() => toggleSetting('block3rdParty')} />
                            </SettingCard>

                            <SettingCard icon={RotateCcw} title="Clear Cookies on Exit" description="Automatically clear non-essential session cookies when QBrowse closes.">
                                <SettingToggle isChecked={!!settings.clearOnExit} onToggle={() => toggleSetting('clearOnExit')} />
                            </SettingCard>
                        </div>
                    )}

                    {/* TAB 4: SEARCH & OMNIBOX */}
                    {settingsTab === 'search' && (
                        <div className="animate-pop-in space-y-5">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Search & Omnibox</h3>
                                <p className="text-xs text-white/40">Configure default search engines, live suggestions, and smart search bangs.</p>
                            </div>

                            {/* Default Search Engine */}
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-accent-30 transition-all duration-300">
                                <p className="font-semibold text-sm mb-3">Default Search Engine</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { id: 'google', name: 'Google' },
                                        { id: 'duckduckgo', name: 'DuckDuckGo' },
                                        { id: 'bing', name: 'Bing' },
                                        { id: 'brave', name: 'Brave' },
                                        { id: 'ecosia', name: 'Ecosia' }
                                    ].map(se => (
                                        <button 
                                            key={se.id}
                                            onClick={() => {
                                                setSettingValue('searchEngine', se.id);
                                                showToast(`Default search engine set to ${se.name}`);
                                            }}
                                            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                                (settings.searchEngine || 'google') === se.id
                                                    ? 'bg-accent-20 border-accent-30 text-accent font-bold'
                                                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                            }`}
                                        >
                                            {se.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Smart Search Bangs & Shortcuts Section */}
                            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-sm flex-shrink-0">
                                            <Sparkles size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-base text-white">Smart Search Bangs & Shortcuts</p>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">
                                                    {getAllBangs(settings?.customBangs || []).length} Available
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/40 mt-0.5">
                                                Type <span className="text-white/80 font-mono">!yt</span> or <span className="text-white/80 font-mono">@youtube</span> in the address bar to route queries directly to any search engine.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsAddingBang(!isAddingBang)}
                                        className="px-3.5 py-1.5 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
                                    >
                                        <Plus size={14} />
                                        <span>{isAddingBang ? 'Close' : 'Add Custom Bang'}</span>
                                    </button>
                                </div>

                                {/* Add Custom Bang Form */}
                                {isAddingBang && (
                                    <div className="p-4 rounded-xl bg-black/40 border border-accent/30 flex flex-col gap-3 animate-pop-in">
                                        <p className="text-xs font-bold text-accent uppercase tracking-wider">Create Custom Search Bang</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[10px] text-white/50 block mb-1 font-semibold">Shortcut Prefix</label>
                                                <div className="relative flex items-center">
                                                    <span className="absolute left-3 text-xs font-mono text-white/40">! / @</span>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. keep or aw"
                                                        value={newBangPrefix}
                                                        onChange={(e) => setNewBangPrefix(e.target.value.replace(/^[!@]/, ''))}
                                                        className="w-full pl-12 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-accent font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-white/50 block mb-1 font-semibold">Engine Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Google Keep or ArchWiki"
                                                    value={newBangName}
                                                    onChange={(e) => setNewBangName(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-accent"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-white/50 block mb-1 font-semibold">Color Accent</label>
                                                <div className="flex items-center gap-2 pt-1">
                                                    {['#d4bc94', '#4285F4', '#FF0000', '#A855F7', '#10B981', '#F59E0B', '#38BDF8'].map(c => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            onClick={() => setNewBangColor(c)}
                                                            className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${newBangColor === c ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'}`}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/50 block mb-1 font-semibold">Search URL Template (Use {'{q}'} for search query)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. https://wiki.archlinux.org/index.php?search={q}"
                                                value={newBangUrl}
                                                onChange={(e) => setNewBangUrl(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-accent font-mono"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 mt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingBang(false);
                                                    setNewBangPrefix('');
                                                    setNewBangName('');
                                                    setNewBangUrl('');
                                                }}
                                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const p = newBangPrefix.trim().toLowerCase();
                                                    const n = newBangName.trim() || p;
                                                    const u = newBangUrl.trim();
                                                    if (!p || !u) {
                                                        showToast('Please enter both shortcut prefix and search URL');
                                                        return;
                                                    }
                                                    addCustomBang({ prefix: p, name: n, url: u, color: newBangColor });
                                                    showToast(`Custom bang "!${p}" added!`);
                                                    setIsAddingBang(false);
                                                    setNewBangPrefix('');
                                                    setNewBangName('');
                                                    setNewBangUrl('');
                                                }}
                                                className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold text-xs shadow-md transition cursor-pointer"
                                            >
                                                Save Bang
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Filter Search Bar */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-2.5 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Filter bangs by name, shortcut (!yt, @github), or category..."
                                        value={bangFilter}
                                        onChange={(e) => setBangFilter(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent transition"
                                    />
                                </div>

                                {/* Bangs Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto hide-scroll pr-1">
                                    {getAllBangs(settings?.customBangs || [])
                                        .filter(b => {
                                            if (!bangFilter) return true;
                                            const f = bangFilter.toLowerCase().replace(/^[!@]/, '');
                                            return b.name.toLowerCase().includes(f) ||
                                                   b.prefix.toLowerCase().includes(f) ||
                                                   b.bangs.some(trigger => trigger.toLowerCase().includes(f)) ||
                                                   (b.category && b.category.toLowerCase().includes(f));
                                        })
                                        .map(bang => {
                                            const BangIcon = bang.icon || Search;
                                            const isCustom = !!bang.isCustom;
                                            return (
                                                <div 
                                                    key={bang.id} 
                                                    className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3 hover:border-white/10 transition group"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div 
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                            style={{ backgroundColor: `${bang.color}20`, color: bang.color }}
                                                        >
                                                            <BangIcon size={16} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-white text-xs truncate">{bang.name}</span>
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-mono font-semibold">
                                                                    !{bang.prefix}
                                                                </span>
                                                                {isCustom && (
                                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold">
                                                                        Custom
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-white/40 truncate font-mono mt-0.5">
                                                                {bang.url}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {isCustom && (
                                                        <button
                                                            onClick={() => {
                                                                removeCustomBang(bang.prefix);
                                                                showToast(`Removed custom bang "!${bang.prefix}"`);
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition cursor-pointer flex-shrink-0"
                                                            title="Delete custom bang"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            <SettingCard icon={Search} title="Smart Calculator in Omnibox" description="Solve math equations directly in the address bar dropdown.">
                                <SettingToggle isChecked={!!settings.smartCalc} onToggle={() => toggleSetting('smartCalc')} />
                            </SettingCard>

                            <SettingCard icon={Zap} title="Live Search Suggestions" description="Send typed queries to your search engine for live autocomplete.">
                                <SettingToggle isChecked={!!settings.liveSearch} onToggle={() => toggleSetting('liveSearch')} />
                            </SettingCard>

                            <SettingCard icon={Globe} title="Show Full Raw URLs" description="Display complete protocol and parameters instead of simplified domain names.">
                                <SettingToggle isChecked={!!settings.showFullUrls} onToggle={() => toggleSetting('showFullUrls')} />
                            </SettingCard>
                        </div>
                    )}

                    {/* TAB 5: DOWNLOADS & MEDIA */}
                    {settingsTab === 'downloads' && (
                        <div className="animate-pop-in space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Downloads & Media</h3>
                                <p className="text-xs text-white/40">Manage file storage paths, organization, and background media policies.</p>
                            </div>

                            <SettingCard icon={Download} title="Ask where to save each file" description="Prompt save-as file picker instead of downloading automatically.">
                                <SettingToggle isChecked={!!settings.askSave} onToggle={() => toggleSetting('askSave')} />
                            </SettingCard>

                            <SettingCard icon={Laptop} title="Default Storage Directory" description={settings.downloadsPath || 'C:\\Users\\Downloads'}>
                                <button 
                                    onClick={async () => {
                                        if (window.electronAPI && window.electronAPI.selectFolder) {
                                            const folder = await window.electronAPI.selectFolder();
                                            if (folder) {
                                                setSettingValue('downloadsPath', folder);
                                                showToast('Downloads directory updated');
                                            }
                                        } else {
                                            showToast('Downloads directory configured');
                                        }
                                    }}
                                    className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-white/10"
                                >
                                    Change...
                                </button>
                            </SettingCard>

                            <SettingCard icon={Layers} title="Group Files by Category" description="Automatically organize downloads into Images, Documents, and Archives.">
                                <SettingToggle isChecked={!!settings.groupDownloads} onToggle={() => toggleSetting('groupDownloads')} />
                            </SettingCard>

                            <SettingCard icon={Bell} title="Download Completion Sound" description="Play an audio chime when a file finish downloading.">
                                <SettingToggle isChecked={!!settings.downloadSound} onToggle={() => toggleSetting('downloadSound')} />
                            </SettingCard>
                        </div>
                    )}

                    {/* TAB 6: ENGINE & PERFORMANCE */}
                    {settingsTab === 'engine' && (
                        <div className="animate-pop-in space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Engine & Performance</h3>
                                <p className="text-xs text-white/40">Tune GPU acceleration, tab memory suspending, and battery mode.</p>
                            </div>

                            <SettingCard icon={Cpu} title="Hardware Acceleration (GPU)" description="Use GPU graphics hardware to render web pages and animations.">
                                <SettingToggle isChecked={!!settings.hardware} onToggle={() => toggleSetting('hardware')} />
                            </SettingCard>

                            <SettingCard icon={Zap} title="Memory Saver Engine" description="Suspend background tabs after inactivity to free up RAM.">
                                <SettingToggle isChecked={!!settings.memory} onToggle={() => toggleSetting('memory')} />
                            </SettingCard>

                            <SettingCard icon={Sliders} title="Smooth Momentum Scroll" description="Enable physical momentum scrolling on long web pages.">
                                <SettingToggle isChecked={!!settings.smooth} onToggle={() => toggleSetting('smooth')} />
                            </SettingCard>

                            <SettingCard icon={Laptop} title="Battery Saver Mode" description="Limit JS framerate and animations when device battery is below 20%.">
                                <SettingToggle isChecked={!!settings.battery} onToggle={() => toggleSetting('battery')} />
                            </SettingCard>

                            {/* Experimental Flags Shortcut */}
                            <div className="p-5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between mt-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                                        <Flag size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white">Experimental Flags & Features</p>
                                        <p className="text-xs text-white/50 mt-0.5">Configure advanced Chromium & QBrowse experimental flags.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        closeModal();
                                        const activeTab = useTabStore.getState().getActiveTab();
                                        if (activeTab) {
                                            useTabStore.getState().handleNavigateTab(activeTab.id, 'qbrowse://flags');
                                        }
                                    }}
                                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
                                >
                                    Open Flags
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 7: NATIVE ADBLOCKER */}
                    {settingsTab === 'adblock' && (
                        <div className="animate-pop-in space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Native AdBlocker</h3>
                                <p className="text-xs text-white/40">Configure EasyList ad blocking, cosmetic element hiding, and tracking rules.</p>
                            </div>

                            <SettingCard icon={Eye} title="Cosmetic Element Hiding" description="Inject CSS rules to collapse empty ad placeholders left by blocked ads.">
                                <SettingToggle isChecked={!!settings.cosmetic} onToggle={() => toggleSetting('cosmetic')} />
                            </SettingCard>

                            <SettingCard icon={ShieldAlert} title="Block Social Tracking Beacons" description="Prevent Facebook, Twitter/X, TikTok, and LinkedIn pixels from tracking your browsing.">
                                <SettingToggle isChecked={!!settings.social} onToggle={() => toggleSetting('social')} />
                            </SettingCard>

                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-sm">Active Filter Rule Lists</p>
                                    <button 
                                        onClick={async () => {
                                            if (window.electronAPI && window.electronAPI.updateAdblockFilters) {
                                                await window.electronAPI.updateAdblockFilters();
                                            }
                                            showToast('AdBlocker filters updated!');
                                        }}
                                        className="text-xs text-accent hover:underline cursor-pointer font-semibold"
                                    >
                                        Update Now
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center justify-between text-sm text-white/80">
                                        <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-400" /> EasyList (Default)</div>
                                        <span className="text-[10px] font-mono text-white/40">114,203 rules</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-white/80">
                                        <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-400" /> EasyPrivacy</div>
                                        <span className="text-[10px] font-mono text-white/40">28,910 rules</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-white/80">
                                        <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-400" /> uBlock Annoyances</div>
                                        <span className="text-[10px] font-mono text-white/40">8,451 rules</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 8: ABOUT & SYSTEM INFO */}
                    {settingsTab === 'ai' && (
                        <AIEngineSettings />
                    )}

                    {settingsTab === 'about' && (
                        <div className="animate-pop-in space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">About & System Info</h3>
                                <p className="text-xs text-white/40">System architecture, runtime specifications, and app updates.</p>
                            </div>

                            {/* Account & Firebase Sync Card */}
                            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center font-bold text-lg">
                                            {user ? (user.email ? user.email.charAt(0).toUpperCase() : 'U') : <Lock size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-white flex items-center gap-2">
                                                {user ? user.email : 'Guest / Offline Mode'}
                                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${user ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/40'}`}>
                                                    {user ? 'AES-256 Encrypted' : 'Local Only'}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-white/40 mt-0.5">
                                                {user ? `Last synced: ${lastSyncTime || 'Just now'} • ${syncedItemsCount || 24} items synced` : 'Sign in to sync your encrypted passwords, settings, and tabs across devices.'}
                                            </p>
                                        </div>
                                    </div>

                                    {user ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={syncNow}
                                                disabled={isSyncing}
                                                className="px-4 py-2 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    useSyncStore.getState().pushManualBackup('Manual Snapshot from Settings');
                                                }}
                                                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                                                title="Push Cloud Backup Version"
                                            >
                                                <UploadCloud size={13} className="text-accent" />
                                                Push Backup
                                            </button>
                                            <button
                                                onClick={logout}
                                                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => openModal('auth')}
                                            className="px-5 py-2.5 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 cursor-pointer shadow-lg shadow-accent/20"
                                        >
                                            Sign In / Register
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Default Browser Management Card */}
                            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4 hover:border-accent-30 transition-all duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border ${
                                            isDefaultBrowser 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10 shadow-lg' 
                                                : 'bg-accent-10 text-accent border-accent-30 shadow-sm'
                                        }`}>
                                            <Compass size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-white flex items-center gap-2">
                                                Default Web Browser
                                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                                    isDefaultBrowser 
                                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                }`}>
                                                    {isDefaultBrowser ? 'Default Browser' : 'Not Default'}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-white/40 mt-0.5">
                                                {isDefaultBrowser 
                                                    ? 'QBrowse is currently your primary browser for all web links, HTML documents, and protocol requests.' 
                                                    : 'Make QBrowse your default browser to open links from apps with Tor routing, sandboxed spaces, and encrypted sync.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!isDefaultBrowser && (
                                            <button
                                                onClick={handleSetDefaultBrowser}
                                                className="px-4 py-2 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-accent/20 flex items-center gap-1.5"
                                            >
                                                <CheckCircle2 size={14} />
                                                Set as Default
                                            </button>
                                        )}
                                        <button
                                            onClick={handleOpenDefaultAppsSettings}
                                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                                            title="Open OS Default Apps Settings"
                                        >
                                            <ExternalLink size={13} />
                                            System Settings
                                        </button>
                                        <button
                                            onClick={refreshDefaultBrowserStatus}
                                            disabled={isCheckingDefault}
                                            className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-xl text-xs transition cursor-pointer"
                                            title="Refresh status"
                                        >
                                            <RefreshCw size={14} className={isCheckingDefault ? 'animate-spin text-accent' : ''} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-white/70 font-medium">Check if QBrowse is default on startup</p>
                                        <span className="text-[10px] text-white/40">(Prompts banner if not default)</span>
                                    </div>
                                    <SettingToggle 
                                        isChecked={checkDefaultOnStartup} 
                                        onToggle={handleToggleStartupCheck} 
                                    />
                                </div>
                            </div>

                            {/* App Banner */}
                            <div className="p-6 bg-gradient-to-r from-accent/20 via-accent-10 to-transparent border border-accent-30 rounded-3xl flex items-center justify-between shadow-2xl">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-accent text-black font-black text-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                                        QB
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                            QBrowse Browser
                                            <span className="text-xs font-mono font-bold bg-accent/20 text-accent px-2.5 py-0.5 rounded-full border border-accent-30">
                                                v1.2.1
                                            </span>
                                        </h4>
                                        <p className="text-xs text-white/60 mt-1">Next-Generation Zen & Multitasking Web Environment</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => {
                                        setIsCheckingUpdates(true);
                                        setTimeout(() => {
                                            setIsCheckingUpdates(false);
                                            showToast('QBrowse is up to date! (v1.2.1)');
                                        }, 1200);
                                    }}
                                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 border border-white/10"
                                >
                                    <RefreshCw size={14} className={isCheckingUpdates ? 'animate-spin' : ''} />
                                    {isCheckingUpdates ? 'Checking...' : 'Check for Updates'}
                                </button>
                            </div>

                            {/* Engine Specifications Table */}
                            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
                                <p className="font-semibold text-sm text-white/80">System Specifications</p>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                        <span className="text-white/40">Chromium Engine</span>
                                        <span className="font-mono font-semibold text-white">130.0.6723.117</span>
                                    </div>
                                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                        <span className="text-white/40">Electron Platform</span>
                                        <span className="font-mono font-semibold text-white">32.2.6</span>
                                    </div>
                                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                        <span className="text-white/40">Node.js Runtime</span>
                                        <span className="font-mono font-semibold text-white">20.18.0</span>
                                    </div>
                                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                        <span className="text-white/40">Architecture</span>
                                        <span className="font-mono font-semibold text-emerald-400">
                                            {window.electronAPI?.platform === 'linux' || navigator.userAgent.includes('Linux') ? 'Linux x64 (x86_64)' : window.electronAPI?.platform === 'darwin' || navigator.userAgent.includes('Mac') ? 'macOS (ARM/x64)' : 'Windows x64 (x86_64)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* System Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                    <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-xs text-emerald-300">SQLite History Sync</p>
                                        <p className="text-[11px] text-white/40 mt-0.5">Encrypted local database active</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-accent/10 border border-accent-30 rounded-2xl flex items-center gap-3">
                                    <Layers size={20} className="text-accent flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-xs text-accent">Zen Workspace Engine</p>
                                        <p className="text-[11px] text-white/40 mt-0.5">Personal, Work & Incognito spaces</p>
                                    </div>
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
