import React, { useState, useEffect, useRef } from 'react';
import {
    Puzzle, FolderPlus, Store, Pin, Settings, RotateCw,
    Trash2, ArrowLeft, X, ShieldAlert, Check, ExternalLink, Plus, Loader2
} from 'lucide-react';
import useExtensionStore from '../../store/useExtensionStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useProfileStore from '../../store/useProfileStore';
import usePopoverAnchor from '../../hooks/usePopoverAnchor';
import {
    getLiquidGlassInlineStyle,
    getLiquidGlassSurfaceClasses,
    getLiquidGlassCardClasses
} from '../common/ContextMenuProvider';
import { useTranslation } from '../../i18n/index';

export default function ExtensionsPopover({ isClosing }) {
    const { t } = useTranslation();
    const theme = useUIStore((state) => state.theme);
    const closePopover = useUIStore((state) => state.closePopover);
    const showToast = useUIStore((state) => state.showToast);
    const activeSpace = useTabStore((state) => state.activeSpace);
    const handleNewTab = useTabStore((state) => state.handleNewTab);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const vaultProvider = useUIStore((state) => state.settings?.vaultProvider || 'qvault');

    const {
        extensions,
        actionStates,
        activePopupExtId,
        pendingInstall,
        isInstalling,
        installError,
        previewCwsInstall,
        confirmCwsInstall,
        cancelCwsInstall,
        pickAndInstallUnpacked,
        setEnabled,
        setPinned,
        reloadExtension,
        removeExtension,
        openExtensionPopup,
        closeExtensionPopup,
        openOptionsPage
    } = useExtensionStore();

    const [cwsInput, setCwsInput] = useState('');
    const [isPopupLoaded, setIsPopupLoaded] = useState(false);
    const [popupZoom, setPopupZoom] = useState(() => {
        try {
            const saved = parseFloat(localStorage.getItem('qbrowse_ext_popup_zoom'));
            if (!Number.isNaN(saved) && saved >= 0.7 && saved <= 1.0) return saved;
        } catch (_) {}
        return 0.85;
    });
    const popupWebviewRef = useRef(null);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const updatePopupZoom = (nextZoom) => {
        const clamped = Math.round(Math.min(1.0, Math.max(0.7, nextZoom)) * 100) / 100;
        setPopupZoom(clamped);
        try {
            localStorage.setItem('qbrowse_ext_popup_zoom', String(clamped));
        } catch (_) {}
    };

    const activePopupExt = activePopupExtId
        ? extensions.find((e) => e.id === activePopupExtId) || null
        : null;

    const anchorSelector = activePopupExt && vaultProvider === `ext:${activePopupExt.id}`
        ? '#tour-vault-trigger'
        : activePopupExt?.pinned
            ? `#tour-pinned-ext-${activePopupExt.id}`
            : '#tour-extensions-trigger';

    const anchor = usePopoverAnchor(anchorSelector, 360, {
        fallbackSelector: '#qbrowse-extensions-hub',
        defaultRight: 16,
        align: 'right'
    });

    useEffect(() => {
        setIsPopupLoaded(false);
    }, [activePopupExt?.id]);

    useEffect(() => {
        const wv = popupWebviewRef.current;
        if (!wv || !activePopupExt) return undefined;
        const onDomReady = () => {
            try {
                if (typeof wv.setZoomFactor === 'function') {
                    wv.setZoomFactor(popupZoom);
                }
            } catch (_) {}
            setIsPopupLoaded(true);
        };
        wv.addEventListener('dom-ready', onDomReady);
        return () => wv.removeEventListener('dom-ready', onDomReady);
    }, [activePopupExt?.id]);

    useEffect(() => {
        const wv = popupWebviewRef.current;
        if (!wv || !activePopupExt || !isPopupLoaded) return;
        try {
            if (typeof wv.setZoomFactor === 'function') {
                wv.setZoomFactor(popupZoom);
            }
        } catch (_) {}
    }, [popupZoom, isPopupLoaded, activePopupExt?.id]);

    const handleQuickInstall = async (e) => {
        e.preventDefault();
        const trimmed = cwsInput.trim();
        if (!trimmed || isInstalling) return;
        const res = await previewCwsInstall(trimmed, activeProfileId);
        if (res?.ok) {
            setCwsInput('');
        }
    };

    const handleLoadUnpacked = async () => {
        const res = await pickAndInstallUnpacked(activeProfileId);
        if (res?.ok) {
            showToast(t('tools.extensions.unpackedLoaded', null, 'Unpacked extension loaded'));
        }
    };

    const handleOpenStore = () => {
        handleNewTab('https://chromewebstore.google.com', true);
        closePopover();
    };

    const handleConfirmInstall = async () => {
        const res = await confirmCwsInstall();
        if (res?.ok) {
            showToast(t('tools.extensions.installedToast', null, 'Extension added to QBrowse'));
        }
    };

    const resolvePopupUrl = (ext) => {
        if (!ext) return '';
        if (ext.popupUrl) return ext.popupUrl;
        const rawPopup = ext.action?.default_popup || ext.browserAction?.default_popup || ext.defaultPopup;
        if (!rawPopup) return '';
        if (rawPopup.startsWith('chrome-extension://')) return rawPopup;
        return `chrome-extension://${ext.id}/${String(rawPopup).replace(/^\/+/, '')}`;
    };

    const resolveOptionsUrl = (ext) => {
        if (!ext) return '';
        return ext.optionsUrl || ext.optionsPage || '';
    };

    return (
        <div
            id="popover-extensions-container"
            data-testid="extensions-popover"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            style={{
                ...anchor.style,
                ...getLiquidGlassInlineStyle(isBright)
            }}
            className={`absolute w-[360px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-76px)] flex flex-col rounded-3xl overflow-hidden z-[70000] origin-top-right ${getLiquidGlassSurfaceClasses(isBright)} ${
                isClosing ? 'animate-pop-out pointer-events-none' : 'animate-pop-in'
            }`}
        >
            {/* MODE 1: PERMISSION APPROVAL VIEW */}
            {pendingInstall ? (
                <div key="ext-mode-confirm" className="p-4 flex flex-col gap-3 animate-ext-view-in">
                    <div className={`flex items-center justify-between pb-2.5 border-b ${isBright ? 'border-black/[0.08]' : 'border-white/[0.08]'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <ShieldAlert size={16} className="text-accent shrink-0" />
                            <span className="text-xs font-semibold truncate">
                                {t('tools.extensions.installConfirmTitle', null, 'Add Extension?')}
                            </span>
                        </div>
                        <button
                            onClick={cancelCwsInstall}
                            className={`p-1 rounded-full transition cursor-pointer ${isBright ? 'hover:bg-black/[0.06] text-zinc-500' : 'hover:bg-white/10 text-white/60'}`}
                            title={t('common.close', null, 'Close')}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className={`p-3 rounded-2xl flex items-center gap-3 ${getLiquidGlassCardClasses(isBright)}`}>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${isBright ? 'bg-black/[0.05]' : 'bg-white/[0.08]'}`}>
                            {pendingInstall.iconUrl ? (
                                <img src={pendingInstall.iconUrl} alt="" className="w-8 h-8 object-contain rounded-lg" />
                            ) : (
                                <Puzzle size={20} className="text-accent" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold truncate">
                                    {pendingInstall.name || pendingInstall.id}
                                </span>
                                {pendingInstall.version && (
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ${isBright ? 'bg-black/[0.06] text-zinc-600' : 'bg-white/10 text-white/65'}`}>
                                        v{pendingInstall.version}
                                    </span>
                                )}
                            </div>
                            <div className={`text-[10px] font-mono truncate mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                {pendingInstall.id}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-0.5">
                        <div className={`text-[11px] font-semibold uppercase tracking-wider ${isBright ? 'text-zinc-500' : 'text-white/55'}`}>
                            {t('tools.extensions.requestedPermissions', null, 'Requested Permissions')}
                        </div>
                        {(!pendingInstall.permissions?.length && !pendingInstall.hostPermissions?.length) ? (
                            <div className={`text-xs px-3 py-2 rounded-xl ${isBright ? 'bg-black/[0.03] text-zinc-600' : 'bg-white/[0.04] text-white/60'}`}>
                                {t('tools.extensions.noSpecialPermissions', null, 'No special permissions requested.')}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {(pendingInstall.permissions || []).map((perm, idx) => (
                                    <span
                                        key={`p-${perm}`}
                                        style={{ animationDelay: `${Math.min(idx * 25, 200)}ms` }}
                                        className={`animate-color-swatch text-[11px] px-2 py-0.5 rounded-lg border ${
                                            isBright
                                                ? 'bg-black/[0.04] border-black/[0.08] text-zinc-700'
                                                : 'bg-white/[0.06] border-white/[0.1] text-white/80'
                                        }`}
                                    >
                                        {perm}
                                    </span>
                                ))}
                                {(pendingInstall.hostPermissions || []).map((host, idx) => (
                                    <span
                                        key={`h-${host}`}
                                        style={{ animationDelay: `${Math.min(((pendingInstall.permissions?.length || 0) + idx) * 25, 220)}ms` }}
                                        className={`animate-color-swatch text-[11px] font-mono px-2 py-0.5 rounded-lg border ${
                                            isBright
                                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-800'
                                                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                        }`}
                                    >
                                        {host}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {installError && (
                        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
                            {installError}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            onClick={cancelCwsInstall}
                            disabled={isInstalling}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                isBright ? 'bg-black/[0.05] hover:bg-black/[0.1] text-zinc-700' : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/80'
                            }`}
                        >
                            {t('common.cancel', null, 'Cancel')}
                        </button>
                        <button
                            onClick={handleConfirmInstall}
                            disabled={isInstalling}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent text-black hover:brightness-110 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                            {isInstalling ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            <span>{t('tools.extensions.addExtension', null, 'Add Extension')}</span>
                        </button>
                    </div>
                </div>
            ) : activePopupExt ? (
                /* MODE 2: EMBEDDED EXTENSION POPUP VIEW */
                <div key={`ext-mode-popup-${activePopupExt.id}`} className="flex flex-col animate-ext-view-in">
                    <div className={`flex items-center justify-between px-3 py-2.5 border-b ${isBright ? 'border-black/[0.08]' : 'border-white/[0.08]'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                onClick={closeExtensionPopup}
                                className={`group p-1 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${isBright ? 'hover:bg-black/[0.06] text-zinc-700' : 'hover:bg-white/10 text-white/80'}`}
                                title={t('common.back', null, 'Back')}
                            >
                                <ArrowLeft size={14} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
                            </button>
                            {activePopupExt.iconUrl ? (
                                <img src={activePopupExt.iconUrl} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                            ) : (
                                <Puzzle size={14} className="text-accent shrink-0" />
                            )}
                            <span className="text-xs font-semibold truncate">{activePopupExt.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <div className={`flex items-center rounded-full px-1 py-0.5 text-[10px] font-mono ${isBright ? 'bg-black/[0.05] text-zinc-600' : 'bg-white/[0.07] text-white/65'}`}>
                                <button
                                    type="button"
                                    onClick={() => updatePopupZoom(popupZoom - 0.05)}
                                    className="px-1 hover:text-accent transition cursor-pointer"
                                    title="Zoom out"
                                >
                                    -
                                </button>
                                <span className="px-0.5 min-w-[30px] text-center">{Math.round(popupZoom * 100)}%</span>
                                <button
                                    type="button"
                                    onClick={() => updatePopupZoom(popupZoom + 0.05)}
                                    className="px-1 hover:text-accent transition cursor-pointer"
                                    title="Zoom in"
                                >
                                    +
                                </button>
                            </div>
                            {resolveOptionsUrl(activePopupExt) && (
                                <button
                                    onClick={() => {
                                        openOptionsPage(activePopupExt.id);
                                        closePopover();
                                    }}
                                    className={`group p-1 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${isBright ? 'hover:bg-black/[0.06] text-zinc-600' : 'hover:bg-white/10 text-white/65'}`}
                                    title={t('tools.extensions.options', null, 'Options')}
                                >
                                    <Settings size={13} className="transition-transform duration-200 group-hover:rotate-45" />
                                </button>
                            )}
                            <button
                                onClick={closePopover}
                                className={`p-1 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${isBright ? 'hover:bg-black/[0.06] text-zinc-600' : 'hover:bg-white/10 text-white/65'}`}
                                title={t('common.close', null, 'Close')}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="relative w-full h-[500px] rounded-b-xl overflow-hidden">
                        {!isPopupLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Loader2 size={18} className="animate-spin text-accent/80" />
                            </div>
                        )}
                        <webview
                            ref={popupWebviewRef}
                            src={resolvePopupUrl(activePopupExt)}
                            partition={`persist:profile_${activeProfileId || 'default'}`}
                            className={`w-full h-full bg-transparent transition-opacity duration-200 ${isPopupLoaded ? 'opacity-100' : 'opacity-0'}`}
                            allowpopups="true"
                        />
                    </div>
                </div>
            ) : (
                /* MODE 3: LIST VIEW */
                <div key="ext-mode-list" className="p-3.5 flex flex-col gap-3 animate-ext-view-in">
                    {/* Header */}
                    <div className={`flex items-center justify-between pb-2.5 border-b ${isBright ? 'border-black/[0.08]' : 'border-white/[0.08]'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isBright ? 'bg-accent/15 text-zinc-900' : 'bg-accent/20 text-accent'}`}>
                                <Puzzle size={14} />
                            </div>
                            <span className="text-sm font-semibold truncate">
                                {t('tools.extensions.title', null, 'Extensions')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={handleLoadUnpacked}
                                disabled={isInstalling}
                                className={`px-2 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1 transition-all duration-150 active:scale-95 cursor-pointer ${
                                    isBright
                                        ? 'bg-black/[0.05] hover:bg-black/[0.1] text-zinc-700'
                                        : 'bg-white/[0.07] hover:bg-white/[0.14] text-white/80'
                                }`}
                                title={t('tools.extensions.loadUnpacked', null, 'Load Unpacked')}
                            >
                                <FolderPlus size={12} />
                                <span>{t('tools.extensions.loadUnpacked', null, 'Load Unpacked')}</span>
                            </button>
                            <button
                                onClick={handleOpenStore}
                                className={`p-1.5 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1 ${
                                    isBright
                                        ? 'bg-black/[0.05] hover:bg-black/[0.1] text-zinc-700'
                                        : 'bg-white/[0.07] hover:bg-white/[0.14] text-white/80'
                                }`}
                                title={t('tools.extensions.chromeWebStore', null, 'Chrome Web Store')}
                            >
                                <Store size={13} />
                                <ExternalLink size={10} className="opacity-70" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Install Input */}
                    <form onSubmit={handleQuickInstall} className="flex items-center gap-1.5">
                        <input
                            type="text"
                            value={cwsInput}
                            onChange={(e) => setCwsInput(e.target.value)}
                            placeholder={t('tools.extensions.installPlaceholder', null, 'Paste Chrome Web Store URL or Extension ID...')}
                            className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl text-xs outline-none border transition ${
                                isBright
                                    ? 'bg-white/80 border-black/[0.08] focus:border-accent text-zinc-900 placeholder:text-zinc-400'
                                    : 'bg-white/[0.05] border-white/[0.1] focus:border-accent/60 text-white placeholder:text-white/35'
                            }`}
                        />
                        <button
                            type="submit"
                            disabled={!cwsInput.trim() || isInstalling}
                            className="p-1.5 rounded-xl bg-accent text-black hover:brightness-110 transition disabled:opacity-40 cursor-pointer shrink-0"
                            title={t('tools.extensions.installBtn', null, 'Install')}
                        >
                            {isInstalling ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        </button>
                    </form>

                    {installError && (
                        <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-2.5 py-1.5">
                            {installError}
                        </div>
                    )}

                    {/* Installed List */}
                    <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto pr-0.5">
                        {extensions.length === 0 ? (
                            <div className={`animate-ext-view-in py-8 px-4 rounded-2xl text-center flex flex-col items-center gap-2 ${
                                isBright ? 'bg-black/[0.03] text-zinc-500' : 'bg-white/[0.03] text-white/50'
                            }`}>
                                <Puzzle size={24} className="opacity-40" />
                                <div className="text-xs font-medium">
                                    {t('tools.extensions.emptyTitle', null, 'No extensions installed')}
                                </div>
                                <div className="text-[11px] opacity-75">
                                    {t('tools.extensions.emptyDesc', null, 'Install from Chrome Web Store or load an unpacked extension.')}
                                </div>
                            </div>
                        ) : (
                            extensions.map((ext) => {
                                const isEnabled = ext.enabled !== false;
                                const isUnpacked = Boolean(ext.isUnpacked || ext.source === 'unpacked' || ext.installType === 'development');
                                const popupUrl = resolvePopupUrl(ext);
                                const optionsUrl = resolveOptionsUrl(ext);
                                const badgeText = actionStates[ext.id]?.badgeText;

                                return (
                                    <div
                                        key={ext.id}
                                        className={`p-2 rounded-2xl flex items-center gap-2.5 transition-opacity duration-200 ${getLiquidGlassCardClasses(isBright)} ${
                                            !isEnabled ? 'opacity-60' : ''
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isEnabled && popupUrl) {
                                                    openExtensionPopup(ext.id);
                                                }
                                            }}
                                            disabled={!isEnabled || !popupUrl}
                                            className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                                                isBright ? 'bg-black/[0.05]' : 'bg-white/[0.08]'
                                            } ${isEnabled && popupUrl ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
                                            title={popupUrl ? ext.name : undefined}
                                        >
                                            {ext.iconUrl ? (
                                                <img src={ext.iconUrl} alt="" className="w-5 h-5 object-contain rounded" />
                                            ) : (
                                                <Puzzle size={15} className="text-accent" />
                                            )}
                                            {badgeText && (
                                                <span className="absolute -bottom-0.5 -right-0.5 px-1 min-w-[14px] h-[13px] rounded-full bg-accent text-black text-[9px] font-bold leading-[13px] text-center">
                                                    {badgeText}
                                                </span>
                                            )}
                                        </button>

                                        <div
                                            onClick={() => {
                                                if (isEnabled && popupUrl) openExtensionPopup(ext.id);
                                            }}
                                            className={`min-w-0 flex-1 ${isEnabled && popupUrl ? 'cursor-pointer' : ''}`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-semibold truncate">{ext.name || ext.id}</span>
                                                {isUnpacked && (
                                                    <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 ${
                                                        isBright ? 'bg-amber-500/15 text-amber-700' : 'bg-amber-500/20 text-amber-300'
                                                    }`}>
                                                        DEV
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-[10px] truncate ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                                {ext.version ? `v${ext.version}` : ext.id}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                onClick={() => setPinned(ext.id, !ext.pinned)}
                                                className={`group p-1 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
                                                    ext.pinned
                                                        ? 'text-accent bg-accent/15'
                                                        : (isBright ? 'text-zinc-500 hover:bg-black/[0.06]' : 'text-white/45 hover:bg-white/10 hover:text-white')
                                                }`}
                                                title={ext.pinned ? t('tools.extensions.unpin', null, 'Unpin from toolbar') : t('tools.extensions.pin', null, 'Pin to toolbar')}
                                            >
                                                <Pin size={12} className={`transition-transform duration-200 ${ext.pinned ? 'rotate-0 scale-110' : 'rotate-45 group-hover:rotate-12'}`} />
                                            </button>

                                            {optionsUrl && (
                                                <button
                                                    onClick={() => {
                                                        openOptionsPage(ext.id);
                                                        closePopover();
                                                    }}
                                                    className={`group p-1 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
                                                        isBright ? 'text-zinc-500 hover:bg-black/[0.06]' : 'text-white/45 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                    title={t('tools.extensions.options', null, 'Options')}
                                                >
                                                    <Settings size={12} className="transition-transform duration-200 group-hover:rotate-45" />
                                                </button>
                                            )}

                                            {isUnpacked && (
                                                <button
                                                    onClick={() => reloadExtension(ext.id)}
                                                    className={`group p-1 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
                                                        isBright ? 'text-zinc-500 hover:bg-black/[0.06]' : 'text-white/45 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                    title={t('tools.extensions.reload', null, 'Reload')}
                                                >
                                                    <RotateCw size={12} className="transition-transform duration-300 group-hover:rotate-180" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setEnabled(ext.id, !isEnabled)}
                                                className={`relative w-7 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer mx-0.5 flex items-center ${
                                                    isEnabled
                                                        ? 'bg-accent'
                                                        : (isBright ? 'bg-black/15' : 'bg-white/15')
                                                }`}
                                                title={isEnabled ? t('tools.extensions.disable', null, 'Disable') : t('tools.extensions.enable', null, 'Enable')}
                                            >
                                                <span className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                                            </button>

                                            <button
                                                onClick={() => removeExtension(ext.id)}
                                                className={`p-1 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
                                                    isBright ? 'text-zinc-500 hover:text-red-600 hover:bg-red-500/10' : 'text-white/45 hover:text-red-400 hover:bg-red-500/15'
                                                }`}
                                                title={t('tools.extensions.remove', null, 'Remove')}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
