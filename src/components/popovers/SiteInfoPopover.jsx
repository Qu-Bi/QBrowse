import React, { useState, useEffect, useCallback } from 'react';
import {
    Lock, Unlock, MapPin, Camera, Mic, Bell, Clipboard, Music, Monitor,
    RotateCcw, Cookie, X, Sparkles, Eye, Shield, Moon, Sun
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useProfileStore from '../../store/useProfileStore';
import CustomSelect from '../common/CustomSelect';
import usePopoverAnchor from '../../hooks/usePopoverAnchor';
import { getLiquidGlassInlineStyle, getLiquidGlassSurfaceClasses } from '../common/ContextMenuProvider';
import { findDarkModeExclusionMatch } from '../../utils/darkModeWhitelist';
import { useTranslation } from '../../i18n/index';

const DEFAULT_SITE_PERMISSIONS = {
    camera: 'ask',
    microphone: 'ask',
    geolocation: 'ask',
    notifications: 'ask',
    'clipboard-read': 'ask',
    midi: 'ask',
    'display-capture': 'ask'
};

export default function SiteInfoPopover({ isClosing }) {
    const { t } = useTranslation();
    const theme = useUIStore(state => state.theme);
    const closePopover = useUIStore(state => state.closePopover);
    const showToast = useUIStore(state => state.showToast);
    const openModal = useUIStore(state => state.openModal);
    const toggleElementEraser = useUIStore(state => state.toggleElementEraser);
    const hiddenElementsByDomain = useUIStore(state => state.hiddenElementsByDomain);
    const eraserSessionRules = useUIStore(state => state.eraserSessionRules);
    const clearHiddenElementsForDomain = useUIStore(state => state.clearHiddenElementsForDomain);
    const isForceDark = useUIStore(state => state.isForceDark);
    const smartDarkStatusByTab = useUIStore(state => state.smartDarkStatusByTab);
    const darkExclusions = useUIStore(state => state.darkExclusions);
    const toggleDarkExclusionForUrl = useUIStore(state => state.toggleDarkExclusionForUrl);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs) || [];
    const customSpaceTabs = useTabStore(state => state.customSpaceTabs) || {};
    const getTabsForSpace = useTabStore(state => state.getTabsForSpace);
    const activeProfileId = useProfileStore(state => state.activeProfileId);

    const isIncognito = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const isEphemeral = isIncognito || isTor;
    const isBright = theme === 'light' && !isIncognito && !isTor;
    const isDark = !isBright;

    const spaceTabs = typeof getTabsForSpace === 'function'
        ? (getTabsForSpace(activeSpace) || [])
        : (activeSpace === 'personal'
            ? privateTabs
            : (activeSpace === 'work'
                ? workTabs
                : (activeSpace === 'tor'
                    ? torTabs
                    : (activeSpace === 'ghost' ? ghostTabs : (customSpaceTabs[activeSpace] || [])))));
    const currentTab = spaceTabs.find(tab => tab.active);

    const activePartition = isIncognito
        ? 'ghost'
        : (isTor ? 'tor' : `persist:profile_${activeProfileId || 'default'}`);

    const [domain, setDomain] = useState('');
    const [origin, setOrigin] = useState('');
    const [cookiesCount, setCookiesCount] = useState(0);
    const [permissions, setPermissions] = useState(DEFAULT_SITE_PERMISSIONS);
    const [isClearing, setIsClearing] = useState(false);

    const fetchPermissionsForOrigin = useCallback((targetOrigin) => {
        if (!targetOrigin || !window.electronAPI?.getSitePermissions) {
            setPermissions({ ...DEFAULT_SITE_PERMISSIONS });
            return;
        }
        window.electronAPI.getSitePermissions(targetOrigin, {
            partition: activePartition,
            isEphemeral
        }).then(perms => {
            setPermissions({
                ...DEFAULT_SITE_PERMISSIONS,
                ...(perms && typeof perms === 'object' ? perms : {})
            });
        }).catch(() => {
            setPermissions({ ...DEFAULT_SITE_PERMISSIONS });
        });
    }, [activePartition, isEphemeral]);

    useEffect(() => {
        if (currentTab && currentTab.url && currentTab.url !== 'about:blank' && !currentTab.url.startsWith('qbrowse://')) {
            try {
                const rawUrl = currentTab.url.includes('://') ? currentTab.url : `https://${currentTab.url}`;
                const parsed = new URL(rawUrl);
                const cleanOrigin = parsed.protocol === 'file:' ? 'file://' : parsed.origin.toLowerCase();
                const cleanDomain = parsed.protocol === 'file:'
                    ? 'Local File'
                    : (parsed.host || parsed.hostname).replace(/^www\./, '').toLowerCase();

                setDomain(cleanDomain);
                setOrigin(cleanOrigin);

                if (parsed.protocol !== 'file:' && window.electronAPI?.getCookies) {
                    const cookieHost = parsed.hostname.replace(/^www\./, '').toLowerCase();
                    window.electronAPI.getCookies({ domain: cookieHost, partition: activePartition }).then(cookies => {
                        setCookiesCount(Array.isArray(cookies) ? cookies.length : 0);
                    }).catch(() => setCookiesCount(0));
                } else {
                    setCookiesCount(0);
                }

                fetchPermissionsForOrigin(cleanOrigin);
            } catch (e) {
                setDomain('');
                setOrigin('');
                setPermissions({ ...DEFAULT_SITE_PERMISSIONS });
            }
        } else {
            setDomain('');
            setOrigin('');
            setCookiesCount(0);
            setPermissions({ ...DEFAULT_SITE_PERMISSIONS });
        }
    }, [currentTab?.url, activePartition, isEphemeral, fetchPermissionsForOrigin]);

    // Stay live-synced whenever a permission popup or Settings updates permissions
    useEffect(() => {
        if (!origin || !window.electronAPI?.onSitePermissionsChanged) return;
        const unsub = window.electronAPI.onSitePermissionsChanged((evt) => {
            if (!evt || !evt.origin || evt.origin === origin) {
                fetchPermissionsForOrigin(origin);
            }
        });
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [origin, fetchPermissionsForOrigin]);

    const permItems = [
        { key: 'camera', label: t('pop.site.permCamera', null, 'Camera'), icon: Camera },
        { key: 'microphone', label: t('pop.site.permMicrophone', null, 'Microphone'), icon: Mic },
        { key: 'geolocation', label: t('pop.site.permGeolocation', null, 'Location'), icon: MapPin },
        { key: 'notifications', label: t('pop.site.permNotifications', null, 'Notifications'), icon: Bell },
        { key: 'clipboard-read', label: t('pop.site.permClipboard', null, 'Clipboard'), icon: Clipboard },
        { key: 'midi', label: t('pop.site.permMidi', null, 'MIDI Devices'), icon: Music },
        { key: 'display-capture', label: t('pop.site.permDisplayCapture', null, 'Screen Share'), icon: Monitor }
    ];

    const handlePermissionChange = async (permKey, value) => {
        setPermissions(prev => ({ ...prev, [permKey]: value }));
        const target = origin || domain;
        if (target && window.electronAPI?.setSitePermission) {
            await window.electronAPI.setSitePermission(target, permKey, value, {
                partition: activePartition,
                isEphemeral
            });
            const permLabel = permItems.find(p => p.key === permKey)?.label || permKey;
            const valLabel = t(`pop.site.perm_${value}`, null, value);
            showToast(`${permLabel} → ${valLabel}`);
        }
    };

    const handleClearSiteData = async () => {
        if (!domain) return;
        setIsClearing(true);
        if (window.electronAPI?.clearSiteCookies) {
            const count = await window.electronAPI.clearSiteCookies(domain, activePartition);
            showToast(t('pop.site.clearedData', { count: count || cookiesCount }, 'Cleared site data ({count} items)'));
            setCookiesCount(0);
        }
        setIsClearing(false);
    };

    const handleResetPermissions = async () => {
        const target = origin || domain;
        if (!target) return;
        if (window.electronAPI?.resetSitePermissions) {
            await window.electronAPI.resetSitePermissions(target, {
                partition: activePartition,
                isEphemeral
            });
            setPermissions({ ...DEFAULT_SITE_PERMISSIONS });
            showToast(t('pop.site.resetPermissionsToast', { domain: domain || target }, 'Reset permissions for {domain}'));
        }
    };

    const anchor = usePopoverAnchor('#tour-siteinfo-trigger', 288, {
        align: 'left',
        defaultLeft: 160,
        defaultTop: 52
    });

    return (
        <div
            id="site-info-popover"
            onClick={e => e.stopPropagation()}
            style={{ ...anchor.style, ...getLiquidGlassInlineStyle(isBright) }}
            className={`absolute z-[80] w-72 rounded-2xl p-3.5 flex flex-col gap-3 transition-colors ${getLiquidGlassSurfaceClasses(isBright)} ${
                isClosing ? 'animate-pop-out' : 'animate-pop-in'
            }`}
        >
            {/* Header: Domain & Lock */}
            {(() => {
                const isInsecure = currentTab?.url?.startsWith('http://') || currentTab?.title?.startsWith('Insecure') || currentTab?.title?.startsWith('Error');
                return (
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            {isInsecure ? (
                                <Unlock size={13} className="text-amber-500 flex-shrink-0" />
                            ) : (
                                <Lock size={13} className="text-emerald-500 flex-shrink-0" />
                            )}
                            <span
                                className={`text-xs font-bold truncate ${isBright ? 'text-zinc-900' : 'text-white/90'}`}
                                title={origin || domain}
                            >
                                {domain || t('pop.site.currentSite', null, 'Current Site')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isInsecure ? (
                                <span className="text-[9px] font-semibold tracking-wide uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    {t('pop.site.notSecure', null, 'Not Secure')}
                                </span>
                            ) : (
                                <span className="text-[9px] font-semibold tracking-wide uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    {t('pop.site.secure', null, 'Secure')}
                                </span>
                            )}
                            <button onClick={closePopover} className={`p-0.5 rounded-md transition cursor-pointer ${isBright ? 'hover:bg-black/5 text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}>
                                <X size={12} />
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Smart Force Dark Mode 1-Click Whitelist Toggle */}
            {(() => {
                const darkMatch = findDarkModeExclusionMatch(currentTab?.url, darkExclusions);
                if (!darkMatch.hostname) return null;

                const isInheritedMatch = darkMatch.excluded && (darkMatch.matchType === 'subdomain' || darkMatch.matchType === 'wildcard');
                const tabDarkStatus = smartDarkStatusByTab?.[currentTab?.id];
                const isNativeDarkDetected = Boolean(isForceDark && !darkMatch.excluded && tabDarkStatus?.isNativelyDark);
                const handleToggleForceDarkExclusion = () => {
                    const res = toggleDarkExclusionForUrl(currentTab?.url);
                    if (!res.ok) return;
                    if (res.action === 'added') {
                        showToast(t('pop.site.darkExcludedToast', { domain: res.rule }, `Excluded ${res.rule} from Force Dark Mode`));
                    } else {
                        showToast(t('pop.site.darkIncludedToast', { domain: res.rule }, `Removed ${res.rule} from Force Dark whitelist`));
                    }
                };

                return (
                    <div className={`pt-2.5 border-t flex items-center justify-between gap-2 text-xs ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            {darkMatch.excluded ? (
                                <Sun size={13} className="text-amber-500 flex-shrink-0" />
                            ) : (
                                <Moon size={13} className={isForceDark ? 'text-accent flex-shrink-0' : (isBright ? 'text-zinc-400 flex-shrink-0' : 'text-white/40 flex-shrink-0')} />
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className={`text-[11px] font-medium truncate ${isBright ? 'text-zinc-800' : 'text-white/90'}`}>
                                    {darkMatch.excluded
                                        ? t('pop.site.darkWhitelisted', null, 'Whitelisted (Native theme)')
                                        : t('pop.site.forceDarkSiteLabel', null, 'Force Dark Mode')}
                                </span>
                                <span className={`text-[10px] truncate ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                    {isInheritedMatch
                                        ? t('pop.site.darkExcludedVia', { rule: darkMatch.matchedRule }, `Excluded via ${darkMatch.matchedRule}`)
                                        : darkMatch.excluded
                                            ? t('pop.site.darkExcludedExact', { rule: darkMatch.matchedRule }, `Skipped on ${darkMatch.matchedRule}`)
                                            : isNativeDarkDetected
                                                ? t('pop.site.darkNativeDetected', null, 'Native dark detected · Not inverted')
                                                : isForceDark
                                                    ? t('pop.site.darkActiveOnSite', null, 'Active on this site')
                                                    : t('pop.site.darkGlobalOff', null, 'Force Dark is off')}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleToggleForceDarkExclusion}
                            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer active:scale-95 ${
                                darkMatch.excluded
                                    ? (isBright
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 hover:bg-amber-500/20'
                                        : 'bg-amber-500/15 border-amber-400/30 text-amber-300 hover:bg-amber-500/25')
                                    : (isBright
                                        ? 'bg-black/[0.04] border-black/10 text-zinc-700 hover:bg-black/[0.08] hover:text-zinc-950'
                                        : 'bg-white/[0.06] border-white/10 text-white/80 hover:bg-white/[0.12] hover:text-white')
                            }`}
                            title={darkMatch.excluded
                                ? t('pop.site.darkRemoveRuleTooltip', { rule: darkMatch.matchedRule }, `Remove ${darkMatch.matchedRule} from whitelist`)
                                : t('pop.site.darkExcludeSiteTooltip', { domain: darkMatch.hostname }, `Exclude ${darkMatch.hostname} from Force Dark Mode`)}
                        >
                            {darkMatch.excluded
                                ? t('pop.site.darkAllowBtn', null, 'Re-enable')
                                : t('pop.site.darkExcludeBtn', null, 'Exclude')}
                        </button>
                    </div>
                );
            })()}

            {/* Distraction Control (Safari-Style Element Eraser) */}
            {domain && (() => {
                const activeRules = isEphemeral
                    ? (eraserSessionRules?.[currentTab?.id] || [])
                    : (hiddenElementsByDomain?.[domain] || []);
                const hiddenCount = activeRules.length;
                return (
                    <div className={`pt-2.5 border-t flex items-center justify-between text-xs ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                        <button
                            type="button"
                            onClick={() => {
                                closePopover();
                                toggleElementEraser(true);
                            }}
                            className={`flex items-center gap-2 py-1 px-2 -ml-1 rounded-lg transition cursor-pointer ${
                                isBright ? 'text-zinc-800 hover:bg-black/5' : 'text-white/85 hover:bg-white/5'
                            }`}
                        >
                            <Sparkles size={13} className="text-accent" />
                            <span className="text-[11px] font-medium">
                                {t('pop.site.hideDistractingItems', null, 'Hide Distracting Items')}
                            </span>
                        </button>
                        {hiddenCount > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    clearHiddenElementsForDomain(domain, { ephemeral: isEphemeral, tabId: currentTab?.id });
                                    showToast(t('chrome.eraserRestoredAllToast', null, 'Restored all hidden items on this page'));
                                }}
                                className="flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline transition cursor-pointer"
                                title={t('pop.site.showHiddenItemsTitle', null, 'Restore all hidden elements on this site')}
                            >
                                <Eye size={11} />
                                <span>{t('pop.site.showHiddenItemsCount', { count: hiddenCount }, `Show Hidden (${hiddenCount})`)}</span>
                            </button>
                        )}
                    </div>
                );
            })()}

            {/* Cookies Info Row */}
            <div className={`pt-2.5 border-t flex items-center justify-between text-xs ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                <div className={`flex items-center gap-2 ${isBright ? 'text-zinc-700' : 'text-white/60'}`}>
                    <Cookie size={13} className={isBright ? 'text-amber-600' : 'text-amber-500/80'} />
                    <span className="text-[11px] font-medium">{t('pop.site.cookiesInUse', null, 'Cookies in use')}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isBright ? 'bg-black/5 text-zinc-700' : 'text-white/45 bg-white/5'}`}>
                        {cookiesCount}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleClearSiteData}
                        disabled={isClearing}
                        className="text-[10px] text-red-500 hover:text-red-400 font-medium transition cursor-pointer"
                        title={t('pop.site.clearCookiesTitle', null, 'Clear cookies & local storage')}
                    >
                        {isClearing ? t('pop.site.clearing', null, 'Clearing...') : t('pop.site.clear', null, 'Clear')}
                    </button>
                    <span className={isBright ? 'text-zinc-300' : 'text-white/20'}>|</span>
                    <button
                        onClick={() => { closePopover(); openModal('cookies'); }}
                        className={`text-[10px] hover:underline font-medium transition cursor-pointer ${isBright ? 'text-amber-700' : 'text-accent'}`}
                    >
                        {t('pop.site.manage', null, 'Manage')}
                    </button>
                </div>
            </div>

            {/* Permissions List */}
            <div className={`pt-2.5 border-t flex flex-col gap-2 ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                        {t('pop.site.sitePermissions', null, 'Site Permissions')}
                    </span>
                    {isEphemeral && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-400/20">
                            <Shield size={9} />
                            {t('pop.permission.sessionOnly', null, 'Session only')}
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    {permItems.map(item => {
                        const Icon = item.icon;
                        const currentVal = permissions[item.key] || 'ask';
                        return (
                            <div key={item.key} className={`flex items-center justify-between py-1 px-1.5 rounded-lg transition ${isBright ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>
                                <div className="flex items-center gap-2">
                                    <Icon size={13} className={isBright ? 'text-zinc-500' : 'text-white/45'} />
                                    <span className={`text-[11px] font-medium ${isDark ? 'text-white/80' : 'text-zinc-800'}`}>
                                        {item.label}
                                    </span>
                                </div>
                                <CustomSelect
                                    value={currentVal}
                                    onChange={(val) => handlePermissionChange(item.key, val)}
                                    size="sm"
                                    isBright={isBright}
                                    options={[
                                        { value: 'allow', label: t('pop.site.perm_allow', null, 'Allow') },
                                        { value: 'block', label: t('pop.site.perm_block', null, 'Block') },
                                        { value: 'ask', label: t('pop.site.perm_ask', null, 'Ask') }
                                    ]}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Reset */}
            <div className={`pt-2 border-t flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                <button
                    onClick={handleResetPermissions}
                    className={`text-[10px] transition flex items-center gap-1 cursor-pointer ${isBright ? 'text-zinc-500 hover:text-zinc-800' : 'text-white/45 hover:text-white/80'}`}
                >
                    <RotateCcw size={10} /> {t('pop.site.resetAllPermissions', null, 'Reset all permissions')}
                </button>
            </div>
        </div>
    );
}
