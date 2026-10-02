import React, { useState, useEffect, useRef } from 'react';
import { 
    Globe, Moon, Sun, ShieldCheck, ArrowRight, Check, X, 
    Download, Compass, Lock, User, Sparkles, Layers,
    CheckCircle2, FolderInput, FileCode, Sliders, ChevronRight,
    KeyRound, UploadCloud, Shield, RefreshCw
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useSyncStore from '../../store/useSyncStore';
import useVaultStore from '../../store/useVaultStore';
import { parseVaultContent } from '../../utils/vaultImporter';
import qbrowseLogo from '../../assets/icon.png';

const ACCENT_PRESETS = [
    { name: 'Amber Gold', hex: '#d4bc94', rgb: '212, 188, 148' },
    { name: 'Cyber Emerald', hex: '#10b981', rgb: '16, 185, 129' },
    { name: 'Electric Blue', hex: '#3b82f6', rgb: '59, 130, 246' },
    { name: 'Royal Violet', hex: '#8b5cf6', rgb: '139, 92, 246' },
    { name: 'Rose Gold', hex: '#f43f5e', rgb: '244, 63, 94' }
];

export default function SetupJourney({ onFinish, onStartTour }) {
    const { 
        theme, setTheme, setAccentColor, accentColor, 
        showToast, isAdblockActive, setIsAdblockActive 
    } = useUIStore();

    const [currentStep, setCurrentStep] = useState(0);
    const [importTab, setImportTab] = useState('bookmarks'); // 'bookmarks' | 'passwords'
    const [detectedBrowsers, setDetectedBrowsers] = useState([]);
    const [importingId, setImportingId] = useState(null);
    const [importedStats, setImportedStats] = useState({});
    const [isDefault, setIsDefault] = useState(false);
    const [isSettingDefault, setIsSettingDefault] = useState(false);
    const [syncEmail, setSyncEmail] = useState('');
    const [syncPassword, setSyncPassword] = useState('');
    const [showSyncForm, setShowSyncForm] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Vault migration state
    const vaultFileInputRef = useRef(null);
    const [isImportingVault, setIsImportingVault] = useState(false);
    const [vaultImportStats, setVaultImportStats] = useState(null);
    const [showVaultPassModal, setShowVaultPassModal] = useState(false);
    const [vaultMasterPass, setVaultMasterPass] = useState('');
    const [vaultMasterPassConfirm, setVaultMasterPassConfirm] = useState('');
    const [pendingVaultData, setPendingVaultData] = useState(null);

    const isBright = theme === 'light';

    // Scan for installed browsers on step 1 (Data Migration)
    useEffect(() => {
        if (window.electronAPI && window.electronAPI.detectBrowsersForImport) {
            window.electronAPI.detectBrowsersForImport().then(res => {
                if (Array.isArray(res)) setDetectedBrowsers(res);
            }).catch(() => {});
        }

        if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
            window.electronAPI.checkDefaultBrowser().then(res => {
                if (res) setIsDefault(!!res.isDefault);
            }).catch(() => {});
        }
    }, []);

    const handleApplyAccent = (preset) => {
        setAccentColor(preset.hex);
        document.documentElement.style.setProperty('--accent', preset.hex);
        document.documentElement.style.setProperty('--accent-rgb', preset.rgb);
    };

    const handleImportBrowser = async (browserId) => {
        if (!window.electronAPI || !window.electronAPI.importBrowserBookmarks) return;
        setImportingId(browserId);
        try {
            const res = await window.electronAPI.importBrowserBookmarks(browserId);
            if (res.success && Array.isArray(res.bookmarks)) {
                // Add key bookmarks to pinned tabs
                const currentPins = useTabStore.getState().pinnedTabs || [];
                const newPins = res.bookmarks.slice(0, 8).map((b, idx) => ({
                    id: `imported-${Date.now()}-${idx}`,
                    title: b.title || 'Bookmark',
                    domain: (b.url || '').replace(/^https?:\/\//i, '').split('/')[0]
                }));
                useTabStore.getState().setPinnedTabs([...currentPins, ...newPins]);
                setImportedStats(prev => ({ ...prev, [browserId]: res.count }));
                showToast(`Successfully imported ${res.count} bookmarks!`);
            } else {
                showToast(res.error || 'Import failed.');
            }
        } catch (e) {
            showToast('Could not import bookmarks.');
        } finally {
            setImportingId(null);
        }
    };

    const handleImportHtmlFile = async () => {
        if (!window.electronAPI || !window.electronAPI.pickAndParseHtmlBookmarks) return;
        try {
            const res = await window.electronAPI.pickAndParseHtmlBookmarks();
            if (res.success && Array.isArray(res.bookmarks)) {
                const currentPins = useTabStore.getState().pinnedTabs || [];
                const newPins = res.bookmarks.slice(0, 8).map((b, idx) => ({
                    id: `html-imported-${Date.now()}-${idx}`,
                    title: b.title || 'Bookmark',
                    domain: (b.url || '').replace(/^https?:\/\//i, '').split('/')[0]
                }));
                useTabStore.getState().setPinnedTabs([...currentPins, ...newPins]);
                showToast(`Imported ${res.count} bookmarks from ${res.filename || 'HTML file'}!`);
                setImportedStats(prev => ({ ...prev, html: res.count }));
            }
        } catch (e) {
            showToast('HTML Bookmarks import failed.');
        }
    };

    const handleVaultFileSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportingVault(true);
        try {
            const text = await file.text();
            const { parsed, sourceName } = parseVaultContent(text, file.name);

            if (!parsed || parsed.length === 0) {
                showToast('No credentials found in file', 'error');
                setIsImportingVault(false);
                return;
            }

            const vaultStore = useVaultStore.getState();
            if (vaultStore.isUnlocked) {
                const res = await vaultStore.importBatchItems(parsed);
                setVaultImportStats({ count: res.total, source: sourceName });
                showToast(`Imported ${res.total} passwords from ${sourceName}!`);
                setIsImportingVault(false);
            } else {
                setPendingVaultData({ parsed, sourceName });
                setShowVaultPassModal(true);
                setIsImportingVault(false);
            }
        } catch (err) {
            console.error('Vault import error:', err);
            showToast(`Import failed: ${err.message}`, 'error');
            setIsImportingVault(false);
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const handleConfirmVaultPass = async (e) => {
        e?.preventDefault();
        if (!vaultMasterPass || vaultMasterPass.length < 4) {
            showToast('Password must be at least 4 characters', 'error');
            return;
        }
        if (vaultMasterPassConfirm && vaultMasterPass !== vaultMasterPassConfirm) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setIsImportingVault(true);
        try {
            const vaultStore = useVaultStore.getState();
            const unlocked = await vaultStore.unlock(vaultMasterPass);
            if (!unlocked) {
                showToast('Incorrect master password for existing vault', 'error');
                setIsImportingVault(false);
                return;
            }

            if (pendingVaultData && pendingVaultData.parsed) {
                const res = await vaultStore.importBatchItems(pendingVaultData.parsed);
                setVaultImportStats({ count: res.total, source: pendingVaultData.sourceName });
                showToast(`Imported ${res.total} passwords from ${pendingVaultData.sourceName}!`);
            }
            setShowVaultPassModal(false);
            setPendingVaultData(null);
            setVaultMasterPass('');
            setVaultMasterPassConfirm('');
        } catch (err) {
            console.error('Failed to unlock and import:', err);
            showToast(`Import error: ${err.message}`, 'error');
        } finally {
            setIsImportingVault(false);
        }
    };

    const handleSetDefault = async () => {
        if (!window.electronAPI || !window.electronAPI.setDefaultBrowser) return;
        setIsSettingDefault(true);
        try {
            const res = await window.electronAPI.setDefaultBrowser();
            if (res.isDefault) {
                setIsDefault(true);
                showToast('QBrowse is now your default browser!');
            } else {
                showToast('System Settings opened. Choose QBrowse as default.');
            }
        } catch (_) {
            showToast('Could not open default browser settings.');
        } finally {
            setIsSettingDefault(false);
        }
    };

    const handleFinishSetup = (startTour = false) => {
        localStorage.setItem('qbrowse_setup_complete', 'true');
        useUIStore.getState().setSetupComplete(true);
        if (startTour) {
            useUIStore.getState().openModal('tutorial');
            if (onStartTour) onStartTour();
        } else {
            useUIStore.getState().closeModal();
            if (onFinish) onFinish();
        }
    };

    const steps = [
        { label: 'Appearance', desc: 'Theme & Accent' },
        { label: 'Import', desc: 'Bookmarks & Passwords' },
        { label: 'Privacy', desc: 'Shields & Tor' },
        { label: 'Default', desc: 'System Integration' },
        { label: 'Ready', desc: 'Profile Setup' }
    ];

    return (
        <div className="fixed inset-0 z-[500000] flex flex-col bg-[#08090c]/96 backdrop-blur-3xl text-white select-none animate-fade-in font-sans">
            {/* Ambient Radial Gradient Core */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] pointer-events-none opacity-30"
                style={{
                    background: 'radial-gradient(circle, var(--accent, #d4bc94) 0%, transparent 70%)'
                }}
            />

            {/* Top Navigation Bar */}
            <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 shadow-sm">
                        <img src={qbrowseLogo} alt="QBrowse" className="w-full h-full object-contain drop-shadow" />
                    </div>
                    <span className="font-bold tracking-tight text-sm text-white">QBrowse Setup</span>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center gap-2">
                    {steps.map((step, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setCurrentStep(idx)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-300 ${
                                currentStep === idx 
                                    ? 'bg-accent/20 border-accent/40 text-accent shadow-sm shadow-accent/20' 
                                    : currentStep > idx 
                                        ? 'bg-white/5 border-white/10 text-emerald-400 hover:bg-white/10' 
                                        : 'bg-transparent border-transparent text-white/40 hover:text-white/60'
                            }`}
                        >
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-white/10">
                                {currentStep > idx ? <Check size={10} strokeWidth={3} /> : idx + 1}
                            </span>
                            <span className="hidden md:inline">{step.label}</span>
                        </div>
                    ))}
                </div>

                {/* Quick Skip Button */}
                <button 
                    onClick={() => handleFinishSetup(false)}
                    className="text-xs text-white/40 hover:text-white/80 transition px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                    Skip Setup
                </button>
            </header>

            {/* Main Stage Content */}
            <main className="relative z-10 flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
                <div className="max-w-2xl w-full">
                    {/* SLIDE 0: APPEARANCE & ACCENT */}
                    {currentStep === 0 && (
                        <div className="animate-pop-in space-y-8 text-center md:text-left">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-accent">Step 1 of 5</span>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-1">Make QBrowse Yours</h2>
                                <p className="text-white/60 text-sm mt-2 leading-relaxed">
                                    Choose your preferred appearance mode and signature accent color. Changes apply in real-time.
                                </p>
                            </div>

                            {/* Theme Selection */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block text-left">
                                    Theme Mode
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div 
                                        onClick={() => setTheme('dark')}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center gap-3.5 ${
                                            theme === 'dark' 
                                                ? 'bg-white/10 border-accent text-white shadow-lg shadow-accent/10' 
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center text-accent">
                                            <Moon size={18} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-sm">Obsidian Dark</h4>
                                            <p className="text-[11px] text-white/40">Sleek, eye-resting dark aesthetic</p>
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setTheme('light')}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center gap-3.5 ${
                                            theme === 'light' 
                                                ? 'bg-white/10 border-accent text-white shadow-lg shadow-accent/10' 
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-zinc-200 border border-black/10 flex items-center justify-center text-zinc-900">
                                            <Sun size={18} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-sm">Porcelain Light</h4>
                                            <p className="text-[11px] text-white/40">Clean, crisp daylight clarity</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Accent Palette */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block text-left">
                                    Signature Accent Color
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {ACCENT_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => handleApplyAccent(preset)}
                                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                                                accentColor?.toLowerCase() === preset.hex.toLowerCase()
                                                    ? 'bg-white/15 border-white shadow-md'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'
                                            }`}
                                        >
                                            <span 
                                                className="w-4 h-4 rounded-full shadow-inner"
                                                style={{ backgroundColor: preset.hex }}
                                            />
                                            <span className="text-xs font-medium">{preset.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SLIDE 1: DATA MIGRATION */}
                    {currentStep === 1 && (
                        <div className="animate-pop-in space-y-6">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-accent">Step 2 of 5</span>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-1">Bring Your Data & Vault</h2>
                                <p className="text-white/60 text-sm mt-2 leading-relaxed">
                                    Import your bookmarks and transition your passwords from Bitwarden, Proton Pass, Chrome, or Firefox.
                                </p>
                            </div>

                            {/* Sliding Pill Selector Switcher */}
                            <div className="relative flex p-1 rounded-full border border-white/10 bg-white/[0.03] shadow-inner max-w-sm mx-auto">
                                <div 
                                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] bg-accent/20 border border-accent/40 shadow-xs"
                                    style={{ 
                                        transform: importTab === 'passwords' ? 'translateX(100%)' : 'translateX(0)'
                                    }}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setImportTab('bookmarks')}
                                    className={`relative z-10 flex-1 py-1.5 text-center text-xs font-semibold rounded-full transition-colors duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                                        importTab === 'bookmarks' ? 'text-accent font-bold' : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    <Globe size={13} />
                                    <span>Bookmarks</span>
                                    {Object.keys(importedStats).length > 0 && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    )}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setImportTab('passwords')}
                                    className={`relative z-10 flex-1 py-1.5 text-center text-xs font-semibold rounded-full transition-colors duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                                        importTab === 'passwords' ? 'text-accent font-bold' : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    <KeyRound size={13} />
                                    <span>Password Vault</span>
                                    {vaultImportStats && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    )}
                                </button>
                            </div>

                            {/* TAB 1: BOOKMARKS */}
                            {importTab === 'bookmarks' && (
                                <div className="space-y-3 animate-tab-fade">
                                    {detectedBrowsers.length > 0 ? (
                                        detectedBrowsers.map((b) => (
                                            <div 
                                                key={b.id}
                                                className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between hover:bg-white/[0.06] transition"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-accent">
                                                        <Globe size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white">{b.name}</h4>
                                                        <p className="text-xs text-white/40">
                                                            {b.found ? `${b.count} bookmarks found` : 'Not detected on this machine'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {b.found && (
                                                    <button
                                                        onClick={() => handleImportBrowser(b.id)}
                                                        disabled={importingId === b.id || importedStats[b.id]}
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                                            importedStats[b.id]
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-accent text-black hover:scale-105 active:scale-95 shadow-sm'
                                                        }`}
                                                    >
                                                        {importedStats[b.id] ? (
                                                            <>
                                                                <Check size={13} strokeWidth={3} />
                                                                <span>Imported</span>
                                                            </>
                                                        ) : importingId === b.id ? (
                                                            <span>Importing...</span>
                                                        ) : (
                                                            <span>Import Bookmarks</span>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-white/50 text-xs">
                                            Scanning for existing browsers...
                                        </div>
                                    )}

                                    {/* HTML Bookmarks Picker */}
                                    <div 
                                        onClick={handleImportHtmlFile}
                                        className="p-4 rounded-2xl border border-dashed border-white/20 hover:border-accent/40 bg-white/[0.02] hover:bg-white/[0.05] transition flex items-center justify-center gap-3 cursor-pointer text-white/70 hover:text-white"
                                    >
                                        <FolderInput size={18} className="text-accent" />
                                        <span className="text-xs font-semibold">
                                            {importedStats.html ? `HTML file imported (${importedStats.html} items)` : 'Upload Bookmarks HTML File (.html)'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: PASSWORD VAULT */}
                            {importTab === 'passwords' && (
                                <div className="space-y-3 animate-tab-fade">
                                    <input 
                                        type="file"
                                        ref={vaultFileInputRef}
                                        onChange={handleVaultFileSelected}
                                        accept=".csv,.json,text/csv,application/json"
                                        className="hidden"
                                    />

                                    {vaultImportStats ? (
                                        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                    <Check size={20} strokeWidth={3} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-emerald-300">Vault Migration Complete</h4>
                                                    <p className="text-xs text-emerald-400/80">
                                                        Successfully imported {vaultImportStats.count} items from {vaultImportStats.source} into QVault!
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => vaultFileInputRef.current?.click()}
                                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/10 text-white transition cursor-pointer"
                                            >
                                                Import Another
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Quick Brand Presets */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div 
                                                    onClick={() => vaultFileInputRef.current?.click()}
                                                    className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-accent/40 hover:bg-white/[0.07] transition cursor-pointer flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold text-xs">
                                                            BW
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-white group-hover:text-accent transition-colors">Bitwarden</h4>
                                                            <p className="text-[11px] text-white/40">Export as .CSV or .JSON</p>
                                                        </div>
                                                    </div>
                                                    <UploadCloud size={15} className="text-white/40 group-hover:text-accent transition-colors" />
                                                </div>

                                                <div 
                                                    onClick={() => vaultFileInputRef.current?.click()}
                                                    className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-accent/40 hover:bg-white/[0.07] transition cursor-pointer flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-xs">
                                                            PP
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-white group-hover:text-accent transition-colors">Proton Pass</h4>
                                                            <p className="text-[11px] text-white/40">Export as .CSV or .JSON</p>
                                                        </div>
                                                    </div>
                                                    <UploadCloud size={15} className="text-white/40 group-hover:text-accent transition-colors" />
                                                </div>
                                            </div>

                                            {/* Primary Upload Area */}
                                            <div 
                                                onClick={() => vaultFileInputRef.current?.click()}
                                                className="p-5 rounded-2xl border border-dashed border-white/20 hover:border-accent/50 bg-white/[0.02] hover:bg-white/[0.05] transition flex flex-col items-center justify-center gap-2 cursor-pointer text-center group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    {isImportingVault ? <RefreshCw size={20} className="animate-spin" /> : <KeyRound size={20} />}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-white group-hover:text-accent transition-colors block">
                                                        {isImportingVault ? 'Parsing Vault File...' : 'Upload Vault Export (.csv or .json)'}
                                                    </span>
                                                    <span className="text-[11px] text-white/40 mt-0.5 block">
                                                        Compatible with Bitwarden, Proton Pass, Google Chrome, Edge, Brave, and 1Password
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SLIDE 2: PRIVACY & TOR SHIELD */}
                    {currentStep === 2 && (
                        <div className="animate-pop-in space-y-8">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-accent">Step 3 of 5</span>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-1">Armor Your Privacy</h2>
                                <p className="text-white/60 text-sm mt-2 leading-relaxed">
                                    QBrowse blocks tracking scripts, eliminates intrusive ads, and routes traffic through the Tor network.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Adblocker Feature */}
                                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                                    <div className="flex items-start gap-3.5 pr-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Ghostery Native Tracker Shield</h4>
                                            <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                                                Blocks trackers, telemetry, analytics, and intrusive ads without slowing down page loads.
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsAdblockActive(!isAdblockActive)}
                                        className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                                            isAdblockActive ? 'bg-emerald-500' : 'bg-white/20'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isAdblockActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* Tor Space Highlight */}
                                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                                    <div className="flex items-start gap-3.5 pr-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                                                <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                                                <circle cx="12" cy="12" r="1.5"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Tor Onion Routing Space</h4>
                                            <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                                                Enables .onion darkweb browsing and multi-node encrypted relay circuits at any time.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30">
                                        Ready
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SLIDE 3: DEFAULT BROWSER */}
                    {currentStep === 3 && (
                        <div className="animate-pop-in space-y-8">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-accent">Step 4 of 5</span>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-1">Set as Default Browser</h2>
                                <p className="text-white/60 text-sm mt-2 leading-relaxed">
                                    Open desktop links in isolated spaces, keeping work and personal research separated automatically.
                                </p>
                            </div>

                            <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 text-center space-y-5">
                                <div className="w-16 h-16 rounded-2xl bg-accent-10 border border-accent-30 text-accent flex items-center justify-center mx-auto shadow-lg shadow-accent/15">
                                    <Compass size={32} />
                                </div>

                                <div>
                                    <h4 className="text-base font-bold text-white">
                                        {isDefault ? 'QBrowse is already your default browser!' : 'Make QBrowse your primary web gateway'}
                                    </h4>
                                    <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
                                        Handles all http://, https://, and HTML files with deep OS system integration.
                                    </p>
                                </div>

                                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        onClick={handleSetDefault}
                                        disabled={isDefault || isSettingDefault}
                                        className={`px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                                            isDefault 
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                : 'bg-accent text-black hover:scale-105 active:scale-95 shadow-lg shadow-accent/20'
                                        }`}
                                    >
                                        {isDefault ? (
                                            <>
                                                <CheckCircle2 size={15} />
                                                <span>Default Browser Set</span>
                                            </>
                                        ) : isSettingDefault ? (
                                            <span>Opening Settings...</span>
                                        ) : (
                                            <>
                                                <span>Set as Default Browser</span>
                                                <ArrowRight size={14} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SLIDE 4: PROFILE & FINISH */}
                    {currentStep === 4 && (
                        <div className="animate-pop-in space-y-8">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-accent">Step 5 of 5</span>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-1">Ready to Explore</h2>
                                <p className="text-white/60 text-sm mt-2 leading-relaxed">
                                    Choose how you want to use QBrowse. No account or email is required.
                                </p>
                            </div>

                            {/* PRIMARY PATH: NO ACCOUNT LOCAL PROFILE */}
                            <div className="p-6 rounded-3xl bg-accent/10 border-2 border-accent/40 shadow-xl shadow-accent/10 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-accent text-black flex items-center justify-center shrink-0 shadow-md">
                                        <User size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-base font-bold text-white">Continue with Local Profile</h4>
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-black px-2 py-0.5 rounded-full">
                                                Recommended
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/70 mt-1 leading-relaxed">
                                            All passwords, history, and workspace tabs remain 100% on your machine, encrypted under local machine keys. Zero telemetry.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button
                                        onClick={() => handleFinishSetup(true)}
                                        className="flex-1 py-3 px-5 bg-accent text-black font-bold text-xs rounded-xl hover:scale-102 active:scale-98 transition shadow-lg shadow-accent/25 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span>Take the Living Tour</span>
                                        <Sparkles size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleFinishSetup(false)}
                                        className="py-3 px-5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                                    >
                                        Start Browsing Directly
                                    </button>
                                </div>
                            </div>

                            {/* OPTIONAL PATH: CLOUD SYNC */}
                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                <div 
                                    onClick={() => setShowSyncForm(!showSyncForm)}
                                    className="flex items-center justify-between cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
                                            <Lock size={15} />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white/90">Connect Encrypted Cloud Sync (Optional)</h5>
                                            <p className="text-[11px] text-white/40">Sync vault and spaces across multiple devices via Firebase</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className={`text-white/40 transition-transform ${showSyncForm ? 'rotate-90' : ''}`} />
                                </div>

                                {showSyncForm && (
                                    <div className="pt-3 border-t border-white/10 space-y-3 animate-pop-in">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <input 
                                                type="email"
                                                placeholder="Email address"
                                                value={syncEmail}
                                                onChange={e => setSyncEmail(e.target.value)}
                                                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                                            />
                                            <input 
                                                type="password"
                                                placeholder="Master password"
                                                value={syncPassword}
                                                onChange={e => setSyncPassword(e.target.value)}
                                                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                                            />
                                        </div>
                                        <p className="text-[10px] text-white/40 leading-snug">
                                            Passwords are client-side encrypted with AES-256 before leaving your computer.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Controls / Stepper */}
            <footer className="relative z-10 flex items-center justify-between px-8 py-5 border-t border-white/[0.08] bg-[#08090c]/80">
                <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white disabled:opacity-0 transition cursor-pointer"
                >
                    Back
                </button>

                <div className="flex items-center gap-3">
                    {currentStep < steps.length - 1 ? (
                        <button
                            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                            className="px-6 py-2.5 bg-accent text-black font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition shadow-lg shadow-accent/20 flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>Continue</span>
                            <ArrowRight size={13} />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleFinishSetup(false)}
                            className="px-6 py-2.5 bg-accent text-black font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition shadow-lg shadow-accent/20 cursor-pointer"
                        >
                            Complete Setup
                        </button>
                    )}
                </div>
            </footer>

            {/* Modal for Master Password when importing into a locked vault */}
            {showVaultPassModal && (
                <div className="fixed inset-0 z-[600000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <form 
                        onSubmit={handleConfirmVaultPass}
                        className="w-full max-w-md bg-[#0f1117] border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-pop-in"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-white">Protect Your Imported Vault</h3>
                                <p className="text-xs text-white/50">Enter or create a Master Password to encrypt your credentials.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 block mb-1">Master Password</label>
                                <input 
                                    type="password"
                                    required
                                    autoFocus
                                    placeholder="Enter master password..."
                                    value={vaultMasterPass}
                                    onChange={e => setVaultMasterPass(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 focus:border-accent outline-none text-xs text-white font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 block mb-1">Confirm Master Password</label>
                                <input 
                                    type="password"
                                    required
                                    placeholder="Confirm password..."
                                    value={vaultMasterPassConfirm}
                                    onChange={e => setVaultMasterPassConfirm(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 focus:border-accent outline-none text-xs text-white font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowVaultPassModal(false);
                                    setPendingVaultData(null);
                                    setVaultMasterPass('');
                                    setVaultMasterPassConfirm('');
                                }}
                                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isImportingVault}
                                className="flex-1 h-10 rounded-xl bg-accent hover:opacity-95 text-black text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                                {isImportingVault ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                                <span>Encrypt & Import</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
