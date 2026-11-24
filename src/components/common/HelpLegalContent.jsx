import React, { useMemo, useState } from 'react';
import {
    HelpCircle,
    Keyboard,
    FileText,
    ShieldCheck,
    Scale,
    Search,
    X,
    ExternalLink,
    Compass,
    SlidersHorizontal,
    Settings,
    Flag,
    Copy,
    Check
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import SlidingPillSwitcher from './SlidingPillSwitcher';
import {
    QBROWSE_META,
    HELP_TOPICS,
    TERMS_OF_SERVICE_SECTIONS,
    PRIVACY_POLICY_SECTIONS,
    MIT_LICENSE_TEXT,
    OPEN_SOURCE_CREDITS
} from '../../utils/helpLegalContent';
import {
    SHORTCUT_ACTIONS,
    SHORTCUT_CATEGORIES,
    getEffectiveCombo,
    formatComboForDisplay
} from '../../utils/shortcutRegistry';

const TAB_ITEMS = [
    { id: 'help', label: 'Help Center', icon: HelpCircle },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'licenses', label: 'Licenses', icon: Scale }
];

const TAB_TO_URL = {
    help: 'qbrowse://help',
    shortcuts: 'qbrowse://shortcuts',
    terms: 'qbrowse://terms',
    privacy: 'qbrowse://privacy',
    licenses: 'qbrowse://licenses'
};

export default function HelpLegalContent({
    activeTab = 'help',
    onTabChange,
    onClose,
    mode = 'modal'
}) {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const settings = useUIStore(state => state.settings);
    const openSettings = useUIStore(state => state.openSettings);
    const openModal = useUIStore(state => state.openModal);
    const switchModal = useUIStore(state => state.switchModal);
    const showToast = useUIStore(state => state.showToast);

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedLicense, setCopiedLicense] = useState(false);

    const customShortcuts = settings?.customShortcuts || {};
    const q = searchQuery.trim().toLowerCase();

    const filteredTopics = useMemo(() => {
        if (!q) return HELP_TOPICS;
        return HELP_TOPICS.filter(topic =>
            topic.title.toLowerCase().includes(q) ||
            topic.summary.toLowerCase().includes(q) ||
            topic.badge.toLowerCase().includes(q) ||
            topic.tips.some(tip => tip.toLowerCase().includes(q))
        );
    }, [q]);

    const filteredShortcutsByCategory = useMemo(() => {
        return SHORTCUT_CATEGORIES.map(category => {
            const items = SHORTCUT_ACTIONS.filter(action => {
                if (action.category !== category) return false;
                if (!q) return true;
                const combo = formatComboForDisplay(getEffectiveCombo(action.id, customShortcuts));
                return (
                    action.label.toLowerCase().includes(q) ||
                    category.toLowerCase().includes(q) ||
                    combo.toLowerCase().includes(q)
                );
            });
            return { category, items };
        }).filter(group => group.items.length > 0);
    }, [q, customShortcuts]);

    const filteredTerms = useMemo(() => {
        if (!q) return TERMS_OF_SERVICE_SECTIONS;
        return TERMS_OF_SERVICE_SECTIONS.filter(
            s => s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
        );
    }, [q]);

    const filteredPrivacy = useMemo(() => {
        if (!q) return PRIVACY_POLICY_SECTIONS;
        return PRIVACY_POLICY_SECTIONS.filter(
            s => s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
        );
    }, [q]);

    const handleOpenInTab = () => {
        const targetUrl = TAB_TO_URL[activeTab] || 'qbrowse://help';
        useTabStore.getState().handleNewTab(targetUrl, true);
        onClose?.();
    };

    const handleCopyLicense = () => {
        try {
            navigator.clipboard.writeText(MIT_LICENSE_TEXT);
            setCopiedLicense(true);
            showToast('MIT License copied to clipboard');
            setTimeout(() => setCopiedLicense(false), 1800);
        } catch (_) {}
    };

    const launchModal = (modalName, extraFn) => {
        if (mode === 'modal' && switchModal) {
            extraFn?.();
            switchModal(modalName);
        } else {
            extraFn?.();
            openModal(modalName);
        }
    };

    const cardClass = isBright
        ? 'bg-black/[0.025] border-black/[0.08] text-zinc-900'
        : 'bg-white/[0.03] border-white/[0.08] text-white';
    const mutedText = isBright ? 'text-zinc-600' : 'text-white/60';

    return (
        <div className={`w-full h-full flex flex-col overflow-hidden select-none font-sans ${isBright ? 'text-zinc-900' : 'text-white'}`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                isBright ? 'border-black/[0.08] bg-white/50' : 'border-white/[0.08] bg-black/20'
            }`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
                        <HelpCircle size={18} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold tracking-tight truncate">
                            {QBROWSE_META.name} Help & Legal
                        </h2>
                        <p className={`text-[11px] truncate ${mutedText}`}>
                            v{QBROWSE_META.version} · {QBROWSE_META.license} · Guides, shortcuts (F1), Terms, Privacy & credits
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`relative flex items-center rounded-full border px-3 py-1.5 ${
                        isBright ? 'bg-white/80 border-black/10' : 'bg-white/[0.05] border-white/10'
                    }`}>
                        <Search size={13} className={`${mutedText} mr-2 shrink-0`} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search help, shortcuts, terms..."
                            className="bg-transparent outline-none text-xs w-44 sm:w-52 placeholder:opacity-50"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="ml-1 opacity-60 hover:opacity-100 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {mode === 'modal' && (
                        <button
                            type="button"
                            onClick={handleOpenInTab}
                            title="Open as Browser Tab"
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-800' : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-white/85'
                            }`}
                        >
                            <ExternalLink size={12} />
                            <span className="hidden sm:inline">Open in Tab</span>
                        </button>
                    )}

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                                isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-600' : 'bg-white/5 hover:bg-white/12 text-white/70 hover:text-white'
                            }`}
                            title="Close (Esc)"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Switcher */}
            <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 overflow-x-auto hide-scroll ${
                isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'
            }`}>
                <SlidingPillSwitcher
                    options={TAB_ITEMS}
                    value={activeTab}
                    onChange={(next) => onTabChange?.(next)}
                    size="sm"
                    isBright={isBright}
                />
                <span className={`text-[11px] font-mono hidden md:inline ${mutedText}`}>
                    Updated {QBROWSE_META.lastUpdated}
                </span>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-5xl mx-auto space-y-5">
                    {activeTab === 'help' && (
                        <>
                            {/* Quick Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => launchModal('tour')}
                                    className="px-3.5 py-2 rounded-full bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <Compass size={13} /> Interactive Living Tour
                                </button>
                                <button
                                    type="button"
                                    onClick={() => launchModal('presetStudio')}
                                    className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                        isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] border-black/10' : 'bg-white/[0.05] hover:bg-white/[0.10] border-white/10'
                                    }`}
                                >
                                    <SlidersHorizontal size={13} className="text-accent" /> Preset Studio
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (mode === 'modal') {
                                            useUIStore.getState().setSettingsTab('appearance');
                                            switchModal?.('settings');
                                        } else {
                                            openSettings('appearance');
                                        }
                                    }}
                                    className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                        isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] border-black/10' : 'bg-white/[0.05] hover:bg-white/[0.10] border-white/10'
                                    }`}
                                >
                                    <Settings size={13} className="text-accent" /> Browser Settings
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        useTabStore.getState().handleNewTab('qbrowse://flags', true);
                                        onClose?.();
                                    }}
                                    className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                        isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] border-black/10' : 'bg-white/[0.05] hover:bg-white/[0.10] border-white/10'
                                    }`}
                                >
                                    <Flag size={13} className="text-accent" /> qbrowse://flags
                                </button>
                            </div>

                            {/* Topics Grid */}
                            {filteredTopics.length === 0 ? (
                                <div className={`p-8 rounded-2xl border text-center text-xs ${cardClass} ${mutedText}`}>
                                    No help topics matched "{searchQuery}".
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {filteredTopics.map(topic => (
                                        <div key={topic.id} className={`p-4 rounded-2xl border flex flex-col gap-2.5 ${cardClass}`}>
                                            <h3 className="text-sm font-bold">{topic.title}</h3>
                                            <p className={`text-xs leading-relaxed ${mutedText}`}>{topic.summary}</p>
                                            <ul className="space-y-1.5 pt-1">
                                                {topic.tips.map((tip, i) => (
                                                    <li key={i} className="text-[11px] flex items-start gap-2 leading-relaxed">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'shortcuts' && (
                        <>
                            <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${cardClass}`}>
                                <div>
                                    <h3 className="text-sm font-bold">Active Keyboard Shortcuts</h3>
                                    <p className={`text-xs ${mutedText}`}>
                                        Reflects your current custom bindings. Press F1 anytime to open Help.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (mode === 'modal') {
                                            useUIStore.getState().setSettingsTab('shortcuts');
                                            switchModal?.('settings');
                                        } else {
                                            openSettings('shortcuts');
                                        }
                                    }}
                                    className="px-3.5 py-2 rounded-full bg-accent text-zinc-950 text-xs font-bold hover:brightness-110 transition cursor-pointer"
                                >
                                    Customize Shortcuts
                                </button>
                            </div>

                            {filteredShortcutsByCategory.length === 0 ? (
                                <div className={`p-8 rounded-2xl border text-center text-xs ${cardClass} ${mutedText}`}>
                                    No shortcuts matched "{searchQuery}".
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {filteredShortcutsByCategory.map(({ category, items }) => (
                                        <div key={category} className={`p-4 rounded-2xl border space-y-2.5 ${cardClass}`}>
                                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-accent">{category}</h4>
                                            <div className="divide-y divide-white/[0.06]">
                                                {items.map(action => {
                                                    const combo = formatComboForDisplay(getEffectiveCombo(action.id, customShortcuts));
                                                    return (
                                                        <div key={action.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                                                            <span>{action.label}</span>
                                                            <kbd className={`px-2 py-0.5 rounded-lg border font-mono text-[11px] shrink-0 ${
                                                                isBright ? 'bg-white border-black/15 text-zinc-800' : 'bg-black/40 border-white/15 text-accent'
                                                            }`}>
                                                                {combo}
                                                            </kbd>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'terms' && (
                        <>
                            <div className={`p-4 rounded-2xl border ${cardClass}`}>
                                <h3 className="text-sm font-bold">QBrowse Terms of Service</h3>
                                <p className={`text-xs mt-0.5 ${mutedText}`}>
                                    Effective {QBROWSE_META.lastUpdated} · Published by {QBROWSE_META.author} ({QBROWSE_META.contactEmail}) · {QBROWSE_META.license} Open Source
                                </p>
                            </div>
                            <div className="space-y-3 select-text">
                                {filteredTerms.map(sec => (
                                    <div key={sec.id} className={`p-4 rounded-2xl border space-y-1.5 ${cardClass}`}>
                                        <h4 className="text-xs font-bold">{sec.title}</h4>
                                        <p className={`text-xs leading-relaxed ${mutedText}`}>{sec.body}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'privacy' && (
                        <>
                            <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${cardClass}`}>
                                <div>
                                    <h3 className="text-sm font-bold flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-emerald-400" />
                                        Privacy-First Guarantee (Zero Telemetry)
                                    </h3>
                                    <p className={`text-xs ${mutedText}`}>
                                        Local-first storage, zero analytics, ephemeral Ghost & Tor isolation, optional AES-GCM encrypted sync.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (mode === 'modal') {
                                            useUIStore.getState().setSettingsTab('privacy');
                                            switchModal?.('settings');
                                        } else {
                                            openSettings('privacy');
                                        }
                                    }}
                                    className={`px-3.5 py-2 rounded-full border text-xs font-semibold transition cursor-pointer ${
                                        isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10' : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10'
                                    }`}
                                >
                                    Privacy Settings
                                </button>
                            </div>
                            <div className="space-y-3 select-text">
                                {filteredPrivacy.map(sec => (
                                    <div key={sec.id} className={`p-4 rounded-2xl border space-y-1.5 ${cardClass}`}>
                                        <h4 className="text-xs font-bold">{sec.title}</h4>
                                        <p className={`text-xs leading-relaxed ${mutedText}`}>{sec.body}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'licenses' && (
                        <>
                            <div className={`p-4 rounded-2xl border space-y-3 ${cardClass}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-bold">QBrowse MIT License</h3>
                                        <p className={`text-xs ${mutedText}`}>Copyright © 2026 {QBROWSE_META.author}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyLicense}
                                        className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                            isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10' : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10'
                                        }`}
                                    >
                                        {copiedLicense ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        <span>{copiedLicense ? 'Copied' : 'Copy License'}</span>
                                    </button>
                                </div>
                                <pre className={`p-3.5 rounded-xl border text-[11px] font-mono whitespace-pre-wrap leading-relaxed select-text ${
                                    isBright ? 'bg-white border-black/10 text-zinc-700' : 'bg-black/35 border-white/10 text-white/75'
                                }`}>
                                    {MIT_LICENSE_TEXT}
                                </pre>
                            </div>

                            <div className="space-y-2.5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-accent px-1">Open-Source Components</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {OPEN_SOURCE_CREDITS.map(item => (
                                        <div key={item.name} className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${cardClass}`}>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate">{item.name}</p>
                                                <p className={`text-[11px] truncate ${mutedText}`}>{item.role}</p>
                                            </div>
                                            <span className={`text-[11px] font-mono shrink-0 ${mutedText}`}>
                                                {item.license}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
