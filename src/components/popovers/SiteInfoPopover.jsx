import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, MapPin, Camera, Bell, Clipboard, Volume2, Code, RotateCcw, Cookie, X, Trash2 } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function SiteInfoPopover({ isClosing }) {
    const isForceDark = useUIStore(state => state.isForceDark);
    const closePopover = useUIStore(state => state.closePopover);
    const showToast = useUIStore(state => state.showToast);
    const openModal = useUIStore(state => state.openModal);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const isIncognito = activeSpace === 'ghost';

    const spaceTabs = activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : ghostTabs);
    const currentTab = spaceTabs.find(t => t.active);

    const [domain, setDomain] = useState('');
    const [cookiesCount, setCookiesCount] = useState(0);
    const [permissions, setPermissions] = useState({
        geolocation: 'ask',
        media: 'ask',
        notifications: 'ask',
        clipboard: 'ask',
        sound: 'allow',
        javascript: 'allow'
    });
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        if (currentTab && currentTab.url && currentTab.url !== 'about:blank') {
            try {
                const parsed = new URL(currentTab.url.includes('://') ? currentTab.url : `https://${currentTab.url}`);
                const cleanDomain = parsed.hostname.replace(/^www\./, '').toLowerCase();
                setDomain(cleanDomain);

                if (window.electronAPI && window.electronAPI.getCookies) {
                    window.electronAPI.getCookies({ domain: cleanDomain }).then(cookies => {
                        setCookiesCount(cookies.length);
                    }).catch(() => setCookiesCount(0));
                }

                if (window.electronAPI && window.electronAPI.getSitePermissions) {
                    window.electronAPI.getSitePermissions(cleanDomain).then(perms => {
                        if (perms) {
                            setPermissions(prev => ({ ...prev, ...perms }));
                        }
                    }).catch(() => {});
                }
            } catch (e) {
                setDomain('');
            }
        }
    }, [currentTab]);

    const handlePermissionChange = async (permKey, value) => {
        setPermissions(prev => ({ ...prev, [permKey]: value }));
        if (domain && window.electronAPI && window.electronAPI.setSitePermission) {
            await window.electronAPI.setSitePermission(domain, permKey, value);
            showToast(`${permKey} -> ${value}`);
        }
    };

    const handleClearSiteData = async () => {
        if (!domain) return;
        setIsClearing(true);
        if (window.electronAPI && window.electronAPI.clearSiteCookies) {
            const count = await window.electronAPI.clearSiteCookies(domain);
            showToast(`Cleared site data (${count || cookiesCount} items)`);
            setCookiesCount(0);
        }
        setIsClearing(false);
    };

    const handleResetPermissions = async () => {
        if (!domain) return;
        if (window.electronAPI && window.electronAPI.resetSitePermissions) {
            await window.electronAPI.resetSitePermissions(domain);
            setPermissions({
                geolocation: 'ask',
                media: 'ask',
                notifications: 'ask',
                clipboard: 'ask',
                sound: 'allow',
                javascript: 'allow'
            });
            showToast(`Reset permissions for ${domain}`);
        }
    };

    const isDark = isForceDark || isIncognito;

    const permItems = [
        { key: 'geolocation', label: 'Location', icon: MapPin },
        { key: 'media', label: 'Camera & Mic', icon: Camera },
        { key: 'notifications', label: 'Notifications', icon: Bell },
        { key: 'clipboard', label: 'Clipboard', icon: Clipboard },
        { key: 'sound', label: 'Sound', icon: Volume2 },
        { key: 'javascript', label: 'JavaScript', icon: Code }
    ];

    return (
        <div 
            onClick={e => e.stopPropagation()} 
            className={`absolute top-[52px] left-[calc(50%-320px)] z-[80] w-72 rounded-2xl backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-3.5 flex flex-col gap-3 text-white ${
                isDark ? 'bg-[#0f1015]/95 border-white/10' : 'bg-white/95 border-black/10 text-gray-800'
            } ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
        >
            {/* Header: Domain & Lock */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Lock size={13} className="text-emerald-400 flex-shrink-0" />
                    <span className={`text-xs font-bold truncate ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                        {domain || 'Current Site'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-semibold tracking-wide uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Secure
                    </span>
                    <button onClick={closePopover} className="p-0.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition">
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Cookies Info Row */}
            <div className={`pt-2.5 border-t flex items-center justify-between text-xs ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                <div className="flex items-center gap-2 text-white/60">
                    <Cookie size={13} className="text-amber-400/80" />
                    <span className="text-[11px] font-medium">Cookies in use</span>
                    <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                        {cookiesCount}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleClearSiteData} 
                        disabled={isClearing}
                        className="text-[10px] text-red-400 hover:text-red-300 font-medium transition cursor-pointer"
                        title="Clear cookies & local storage"
                    >
                        {isClearing ? 'Clearing...' : 'Clear'}
                    </button>
                    <span className="text-white/20">|</span>
                    <button 
                        onClick={() => { closePopover(); openModal('cookies'); }} 
                        className="text-[10px] text-accent hover:underline font-medium transition cursor-pointer"
                    >
                        Manage
                    </button>
                </div>
            </div>

            {/* Permissions List */}
            <div className={`pt-2.5 border-t flex flex-col gap-2 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Site Permissions
                </span>

                <div className="flex flex-col gap-1">
                    {permItems.map(item => {
                        const Icon = item.icon;
                        const currentVal = permissions[item.key] || 'ask';
                        return (
                            <div key={item.key} className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 transition">
                                <div className="flex items-center gap-2">
                                    <Icon size={13} className="text-white/40" />
                                    <span className={`text-[11px] font-medium ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                        {item.label}
                                    </span>
                                </div>
                                <select
                                    value={currentVal}
                                    onChange={(e) => handlePermissionChange(item.key, e.target.value)}
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md outline-none cursor-pointer transition border ${
                                        currentVal === 'allow'
                                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                            : currentVal === 'block'
                                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                            : 'bg-white/5 text-white/50 border-white/10'
                                    }`}
                                >
                                    <option value="allow" className="bg-[#121318] text-emerald-400">Allow</option>
                                    <option value="block" className="bg-[#121318] text-red-400">Block</option>
                                    <option value="ask" className="bg-[#121318] text-gray-300">Ask</option>
                                </select>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Reset */}
            <div className={`pt-2 border-t flex items-center justify-between ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                <button 
                    onClick={handleResetPermissions} 
                    className="text-[10px] text-white/40 hover:text-white/80 transition flex items-center gap-1 cursor-pointer"
                >
                    <RotateCcw size={10} /> Reset all permissions
                </button>
            </div>
        </div>
    );
}
