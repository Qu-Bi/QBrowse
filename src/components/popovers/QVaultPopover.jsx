import React, { useState, useEffect } from 'react';
import { 
    Lock, Unlock, KeyRound, Eye, EyeOff, Copy, Plus, Search, 
    ShieldCheck, Check, X, RefreshCw, Globe, Fingerprint, 
    Zap, Settings, ArrowLeft, Shield, Sparkles, Pencil, Trash2 
} from 'lucide-react';
import useVaultStore from '../../store/useVaultStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function QVaultPopover({ isClosing }) {
    const { 
        isUnlocked, masterPassword, pinCode, unlock, unlockWithPin, 
        setPin, lock, passwords, fetchPasswords, addNewItem, deleteItem, updateItem, isLoading, error 
    } = useVaultStore();

    const showToast = useUIStore(state => state.showToast);
    const currentUrl = useUIStore(state => state.currentUrl);

    // View Modes: 'vault' | 'add' | 'settings'
    const [viewMode, setViewMode] = useState('vault');
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'logins' | 'passkeys' | 'generator'
    const [unlockMode, setUnlockMode] = useState(pinCode ? 'pin' : 'password');
    const [editingItemId, setEditingItemId] = useState(null);

    // Inputs
    const [masterPassInput, setMasterPassInput] = useState('');
    const [pinInput, setPinInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [revealedPasswords, setRevealedPasswords] = useState({});
    const [copiedId, setCopiedId] = useState(null);

    // Settings View Inputs
    const [newPinInput, setNewPinInput] = useState(pinCode || '');
    const [oldPassInput, setOldPassInput] = useState('');
    const [newMasterPass, setNewMasterPass] = useState('');
    const [confirmMasterPass, setConfirmMasterPass] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);

    // Add Item Form Inputs
    const [newItemType, setNewItemType] = useState('login'); // 'login' | 'passkey'
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passkeyRpId, setPasskeyRpId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Generator Tab State
    const [genLength, setGenLength] = useState(16);
    const [useUpper, setUseUpper] = useState(true);
    const [useLower, setUseLower] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [generatedResult, setGeneratedResult] = useState('');

    useEffect(() => {
        if (isUnlocked) {
            fetchPasswords();
        }
    }, [isUnlocked, fetchPasswords]);

    useEffect(() => {
        generateCustomPassword();
    }, [genLength, useUpper, useLower, useNumbers, useSymbols]);

    const generateCustomPassword = () => {
        let chars = '';
        if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (useNumbers) chars += '0123456789';
        if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

        let res = '';
        for (let i = 0; i < genLength; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setGeneratedResult(res);
    };

    const handleUnlockSubmit = async (e) => {
        e.preventDefault();
        if (unlockMode === 'password') {
            if (!masterPassInput.trim()) return;
            const success = await unlock(masterPassInput);
            if (success) {
                sessionStorage.setItem('qbrowse_vault_mp', masterPassInput);
                setMasterPassInput('');
            }
        } else {
            if (!pinInput.trim()) return;
            await unlockWithPin(pinInput);
            setPinInput('');
        }
    };

    const handleSavePin = (e) => {
        e.preventDefault();
        if (newPinInput && newPinInput.length < 4) {
            showToast('PIN must be at least 4 digits', 'error');
            return;
        }
        setPin(newPinInput);
        showToast(newPinInput ? 'Quick PIN updated!' : 'Quick PIN disabled');
    };

    const handleChangeMasterPassword = async (e) => {
        e.preventDefault();
        if (!oldPassInput || !newMasterPass) {
            showToast('All fields are required', 'error');
            return;
        }
        if (newMasterPass !== confirmMasterPass) {
            showToast('New passwords do not match', 'error');
            return;
        }
        setIsChangingPass(true);
        try {
            const success = await window.electronAPI.changeMasterPassword(oldPassInput, newMasterPass);
            if (success) {
                showToast('Master password changed successfully!');
                setOldPassInput('');
                setNewMasterPass('');
                setConfirmMasterPass('');
                setViewMode('vault');
            } else {
                showToast('Current password incorrect', 'error');
            }
        } catch {
            showToast('Failed to change password', 'error');
        } finally {
            setIsChangingPass(false);
        }
    };

    const handleOpenAddForm = (type = 'login') => {
        setEditingItemId(null);
        setNewItemType(type);
        setViewMode('add');

        if (currentUrl && currentUrl !== 'about:blank') {
            try {
                const u = new URL(currentUrl);
                setTitle(u.hostname.replace('www.', ''));
                setUrl(currentUrl);
                setPasskeyRpId(u.hostname);
            } catch {
                setTitle('');
                setUrl(currentUrl);
                setPasskeyRpId('');
            }
        } else {
            setTitle('');
            setUrl('');
            setPasskeyRpId('');
        }
        setUsername('');
        setPassword('');
    };

    const handleOpenEditForm = (item) => {
        setEditingItemId(item.id);
        setNewItemType(item.itemType || 'login');
        setTitle(item.title || '');
        setUsername(item.username || '');
        setPassword(item.password || '');
        setUrl(item.url || '');
        setPasskeyRpId(item.passkeyData?.rpId || item.url || '');
        setViewMode('add');
    };

    const handleDeleteItem = async (id, title) => {
        console.log('[QVault Debug] Delete button clicked for:', { id, title });
        try {
            await deleteItem(id);
            console.log('[QVault Debug] Delete item succeeded for id:', id);
            showToast(`Deleted ${title} from QVault`);
        } catch (err) {
            console.error('[QVault Debug] Delete item failed error:', err);
            showToast(`Delete failed: ${err.message || err}`, 'error');
        }
    };

    const handleSaveNewItem = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            showToast('Title is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            let passkeyData = null;
            if (newItemType === 'passkey') {
                passkeyData = {
                    rpId: passkeyRpId || url || title,
                    credentialId: 'pk_' + Math.random().toString(36).substring(2, 12),
                    created: Date.now()
                };
            }

            if (editingItemId) {
                await updateItem({
                    id: editingItemId,
                    type: newItemType,
                    title,
                    username,
                    password,
                    url,
                    passkeyData
                });
                showToast(`Updated ${title}!`);
            } else {
                await addNewItem({
                    type: newItemType,
                    title,
                    username,
                    password,
                    url,
                    passkeyData
                });
                showToast(`Saved ${title}!`);
            }

            setEditingItemId(null);
            setViewMode('vault');
        } catch (err) {
            showToast('Failed to save item', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutofillPage = (entry) => {
        const { privateTabs, workTabs, ghostTabs, activeSpace } = useTabStore.getState();
        const tabs = activeSpace === 'personal' ? privateTabs : activeSpace === 'work' ? workTabs : ghostTabs;
        const activeTabObj = tabs.find(t => t.active);

        if (activeTabObj) {
            const wv = document.getElementById(`webview-${activeTabObj.id}`);
            if (wv && wv.executeJavaScript) {
                wv.executeJavaScript(`
                    (() => {
                        const userInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[autocomplete*="username"]');
                        const passInputs = document.querySelectorAll('input[type="password"], input[name*="pass"], input[autocomplete*="password"]');
                        let filled = false;
                        if (userInputs.length > 0 && ${JSON.stringify(entry.username || '')}) {
                            userInputs[0].value = ${JSON.stringify(entry.username || '')};
                            userInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                            userInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                            filled = true;
                        }
                        if (passInputs.length > 0 && ${JSON.stringify(entry.password || '')}) {
                            passInputs[0].value = ${JSON.stringify(entry.password || '')};
                            passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                            passInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                            filled = true;
                        }
                        return filled;
                    })();
                `).then((res) => {
                    showToast(res ? `Autofilled ${entry.title}!` : 'Copied password to clipboard!');
                }).catch(() => {
                    navigator.clipboard.writeText(entry.password);
                    showToast(`Copied password for ${entry.title}!`);
                });
            } else {
                navigator.clipboard.writeText(entry.password);
                showToast(`Copied password for ${entry.title}!`);
            }
        }
    };

    const toggleReveal = (id) => {
        setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text, label, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(`${label}-${id}`);
        showToast(`Copied ${label}!`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Process stored items
    const parsedItems = passwords.map(p => {
        let meta = { type: 'login', passkeyData: null };
        let cleanTitle = p.title || '';
        if (cleanTitle.includes('|||')) {
            const parts = cleanTitle.split('|||');
            cleanTitle = parts[0];
            try {
                meta = JSON.parse(parts[1]);
            } catch {}
        }
        return {
            ...p,
            title: cleanTitle,
            itemType: meta.type || 'login',
            passkeyData: meta.passkeyData || null
        };
    });

    const filteredItems = parsedItems.filter(item => {
        const q = searchQuery.toLowerCase();
        const matchesQuery = (
            item.title.toLowerCase().includes(q) ||
            item.username?.toLowerCase().includes(q) ||
            item.url?.toLowerCase().includes(q)
        );
        if (!matchesQuery) return false;
        if (categoryFilter === 'all') return true;
        if (categoryFilter === 'logins') return item.itemType === 'login';
        if (categoryFilter === 'passkeys') return item.itemType === 'passkey';
        return true;
    });
    const currentDomain = (() => {
        if (!currentUrl || currentUrl === 'about:blank') return '';
        try {
            return new URL(currentUrl).hostname.replace('www.', '').toLowerCase();
        } catch {
            return '';
        }
    })();

    const matchingSiteItems = parsedItems.filter(item => {
        if (!currentDomain) return false;
        const itemHost = (item.url || item.title || '').toLowerCase();
        return itemHost.includes(currentDomain) || currentDomain.includes(itemHost);
    });

    return (
        <div 
            onClick={e => e.stopPropagation()} 
            className={`absolute top-4 right-4 z-[70000] w-[400px] rounded-3xl bg-[#0c0d10]/60 backdrop-blur-3xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.65)] text-white overflow-hidden p-5 transition-all duration-300 ${isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/15 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-colors ${isUnlocked ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-accent/20 text-accent border-accent/30'}`}>
                        {isUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">QVault</h3>
                        <p className="text-[10px] text-white/50">{isUnlocked ? `${passwords.length} saved items` : 'Encrypted Vault'}</p>
                    </div>
                </div>

                {isUnlocked && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewMode(viewMode === 'settings' ? 'vault' : 'settings')} className={`p-2 rounded-xl border transition ${viewMode === 'settings' ? 'bg-accent/20 text-accent border-accent/30' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`} title="Vault Settings">
                            <Settings size={15} />
                        </button>
                        <button onClick={() => handleOpenAddForm('login')} className="px-3.5 py-2 rounded-xl bg-accent text-white hover:brightness-110 text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-accent/20" title="Add Password">
                            <Plus size={14} strokeWidth={3} /> Add
                        </button>
                        <button onClick={lock} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs transition" title="Lock Vault">
                            <Lock size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* LOCKED VIEW */}
            {!isUnlocked ? (
                <div className="flex flex-col gap-4 py-2">
                    {/* Unlock Mode Selector */}
                    {pinCode && (
                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 gap-1">
                            <button onClick={() => setUnlockMode('pin')} className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${unlockMode === 'pin' ? 'bg-accent text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                                Quick PIN
                            </button>
                            <button onClick={() => setUnlockMode('password')} className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${unlockMode === 'password' ? 'bg-accent text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                                Master Password
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleUnlockSubmit} className="flex flex-col gap-4">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3.5">
                            <Shield size={26} className="text-accent shrink-0" />
                            <div className="text-xs text-white/70 leading-relaxed">
                                {unlockMode === 'pin' ? 'Enter your 4-digit PIN to unlock QVault.' : 'Enter your Master Password to decrypt your stored credentials.'}
                            </div>
                        </div>

                        {unlockMode === 'password' ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Master Password</label>
                                <input
                                    type="password"
                                    autoFocus
                                    value={masterPassInput}
                                    onChange={(e) => setMasterPassInput(e.target.value)}
                                    placeholder="Enter master password..."
                                    className="w-full h-11 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm font-mono text-white placeholder-white/30 outline-none focus:border-accent focus:bg-black/60 transition-all"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">PIN Code</label>
                                <input
                                    type="password"
                                    autoFocus
                                    maxLength={6}
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    placeholder="••••"
                                    className="w-full h-11 bg-black/40 border border-white/10 rounded-2xl px-4 text-center text-xl font-mono tracking-[0.5em] text-white placeholder-white/30 outline-none focus:border-accent focus:bg-black/60 transition-all"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-xl">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 mt-1 rounded-2xl bg-accent text-white hover:brightness-110 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent/25 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                            Unlock Vault
                        </button>
                    </form>
                </div>
            ) : viewMode === 'settings' ? (
                /* SETTINGS VIEW */
                <div className="flex flex-col gap-4 py-1 animate-slide-down-fade">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                        <button onClick={() => setViewMode('vault')} className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition">
                            <ArrowLeft size={15} /> Vault Settings
                        </button>
                    </div>

                    {/* Quick PIN Settings */}
                    <form onSubmit={handleSavePin} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2.5">
                        <span className="text-xs font-bold text-white">Quick PIN Unlock</span>
                        <p className="text-[11px] text-white/50">Set a 4-6 digit PIN for fast vault access.</p>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="password"
                                maxLength={6}
                                placeholder="Set PIN (e.g. 1234)"
                                value={newPinInput}
                                onChange={e => setNewPinInput(e.target.value)}
                                className="flex-1 h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-center text-sm font-mono tracking-widest text-white outline-none focus:border-accent"
                            />
                            <button type="submit" className="px-4 h-10 rounded-xl bg-accent text-white font-bold text-xs hover:brightness-110 transition shadow-sm">
                                Save PIN
                            </button>
                        </div>
                    </form>

                    {/* Master Password Settings */}
                    <form onSubmit={handleChangeMasterPassword} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
                        <span className="text-xs font-bold text-white">Change Master Password</span>
                        <input
                            type="password"
                            required
                            placeholder="Current Master Password"
                            value={oldPassInput}
                            onChange={e => setOldPassInput(e.target.value)}
                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                        />
                        <input
                            type="password"
                            required
                            placeholder="New Master Password"
                            value={newMasterPass}
                            onChange={e => setNewMasterPass(e.target.value)}
                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                        />
                        <input
                            type="password"
                            required
                            placeholder="Confirm New Master Password"
                            value={confirmMasterPass}
                            onChange={e => setConfirmMasterPass(e.target.value)}
                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                        />
                        <button type="submit" disabled={isChangingPass} className="w-full h-10 mt-1 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 text-white font-bold text-xs transition">
                            {isChangingPass ? 'Updating...' : 'Update Master Password'}
                        </button>
                    </form>
                </div>
            ) : viewMode === 'add' ? (
                /* ADD NEW ITEM VIEW */
                <form onSubmit={handleSaveNewItem} className="flex flex-col gap-3.5 py-1 animate-slide-down-fade">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                        <button type="button" onClick={() => setViewMode('vault')} className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition">
                            <ArrowLeft size={15} /> Back
                        </button>
                        <span className="text-xs font-bold text-white">New Item</span>
                    </div>

                    {/* Type Selector */}
                    <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/10">
                        <button type="button" onClick={() => setNewItemType('login')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${newItemType === 'login' ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}>
                            Login
                        </button>
                        <button type="button" onClick={() => setNewItemType('passkey')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${newItemType === 'passkey' ? 'bg-purple-500 text-white' : 'text-white/40 hover:text-white'}`}>
                            Passkey
                        </button>
                    </div>

                    <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto hide-scroll pr-1">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-white/40">Title</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. GitHub Account"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                            />
                        </div>

                        {newItemType === 'passkey' ? (
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-white/40">Domain / RP ID</label>
                                <input
                                    type="text"
                                    placeholder="github.com"
                                    value={passkeyRpId}
                                    onChange={e => setPasskeyRpId(e.target.value)}
                                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-white/40">Website URL</label>
                                <input
                                    type="text"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-white/40">Username / Email</label>
                            <input
                                type="text"
                                placeholder="user@domain.com"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-white/40">Password</label>
                                <button type="button" onClick={() => { generateCustomPassword(); setPassword(generatedResult); showToast('Generated password!'); }} className="text-[10px] text-accent font-semibold hover:underline">
                                    Generate Random
                                </button>
                            </div>
                            <input
                                type="text"
                                required={newItemType === 'login'}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-accent"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2.5 mt-2 pt-2 border-t border-white/10">
                        <button type="button" onClick={() => setViewMode('vault')} className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="flex-1 h-10 rounded-xl bg-accent text-white hover:brightness-110 font-bold text-xs transition shadow-md shadow-accent/20">
                            {isSaving ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            ) : (
                /* UNLOCKED MAIN VAULT VIEW */
                <div className="flex flex-col gap-3.5">
                    {/* Category Filter Pills */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-2xl border border-white/10 text-center">
                        <button onClick={() => setCategoryFilter('all')} className={`py-2 rounded-xl text-xs font-bold transition-all ${categoryFilter === 'all' ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            All ({parsedItems.length})
                        </button>
                        <button onClick={() => setCategoryFilter('logins')} className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${categoryFilter === 'logins' ? 'bg-accent text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <Globe size={11} /> Logins
                        </button>
                        <button onClick={() => setCategoryFilter('passkeys')} className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${categoryFilter === 'passkeys' ? 'bg-purple-500 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <Fingerprint size={11} /> Passkeys
                        </button>
                        <button onClick={() => setCategoryFilter('generator')} className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${categoryFilter === 'generator' ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <Sparkles size={11} /> Generator
                        </button>
                    </div>

                    {categoryFilter === 'generator' ? (
                        /* GENERATOR TAB */
                        <div className="flex flex-col gap-3.5 py-1 animate-slide-down-fade">
                            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl flex flex-col gap-2 relative">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Generated Password</span>
                                <div className="flex items-center justify-between font-mono text-sm font-bold text-emerald-400 break-all select-all">
                                    <span>{generatedResult}</span>
                                    <button onClick={() => copyToClipboard(generatedResult, 'generated password', 'gen')} className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition shrink-0 ml-2" title="Copy">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white/80">Length: {genLength}</span>
                                    <input 
                                        type="range" 
                                        min={8} 
                                        max={32} 
                                        value={genLength} 
                                        onChange={e => setGenLength(Number(e.target.value))}
                                        className="w-32 accent-accent cursor-pointer"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-white/70 pt-2.5 border-t border-white/10">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} className="rounded accent-accent" /> A-Z (Upper)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} className="rounded accent-accent" /> a-z (Lower)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} className="rounded accent-accent" /> 0-9 (Numbers)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} className="rounded accent-accent" /> !@#$ (Symbols)
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* VAULT ITEMS LIST VIEW */
                        <div className="flex flex-col gap-3">
                            {/* Saved for this website section */}
                            {currentDomain && matchingSiteItems.length > 0 && (
                                <div className="p-3 bg-accent/10 border border-accent/20 rounded-2xl flex flex-col gap-2 animate-slide-down-fade">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                                            <Globe size={13} /> Saved for {currentDomain}
                                        </span>
                                        <span className="text-[10px] bg-accent/20 px-2 py-0.5 rounded-full text-accent font-bold">
                                            {matchingSiteItems.length} matching
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {matchingSiteItems.map(item => (
                                            <div key={item.id} className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/10">
                                                <div className="flex flex-col truncate">
                                                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                                                    {item.username && <span className="text-[10px] text-white/50 truncate">{item.username}</span>}
                                                </div>
                                                <button onClick={() => handleAutofillPage(item)} className="px-3 py-1.5 rounded-xl bg-accent text-white hover:brightness-110 font-bold text-xs flex items-center gap-1 shadow-sm transition">
                                                    <Zap size={12} strokeWidth={3} /> Autofill
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search bar */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Search vault items..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white placeholder-white/30 outline-none focus:border-accent transition-colors"
                                />
                            </div>

                            {/* Items List */}
                            <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto hide-scroll pr-0.5">
                                {filteredItems.length === 0 ? (
                                    <div className="text-center text-white/40 text-xs italic py-8">
                                        {searchQuery ? 'No matching vault items found.' : 'Vault is empty. Click + Add to store logins or passkeys!'}
                                    </div>
                                ) : (
                                    filteredItems.map((item) => {
                                        const isRevealed = revealedPasswords[item.id];
                                        return (
                                            <div key={item.id} className="p-3.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl flex flex-col gap-2.5 transition-all group">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                                                            item.itemType === 'passkey' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                                            'bg-accent/20 text-accent border-accent/30'
                                                        }`}>
                                                            {item.itemType === 'passkey' ? <Fingerprint size={15} /> : <Globe size={15} />}
                                                        </div>
                                                        <div className="flex flex-col truncate">
                                                            <span className="text-xs font-bold text-white truncate">{item.title}</span>
                                                            {item.username && <span className="text-[10px] text-white/40 truncate">{item.username}</span>}
                                                        </div>
                                                    </div>

                                                    {/* Quick Actions */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {item.itemType === 'login' && (
                                                            <button onClick={() => handleAutofillPage(item)} className="px-2 py-1.5 rounded-xl bg-accent text-white hover:brightness-110 font-bold text-[10px] flex items-center gap-1 transition shadow-sm" title="Autofill in active webview page">
                                                                <Zap size={12} strokeWidth={3} /> Autofill
                                                            </button>
                                                        )}
                                                        {item.password && (
                                                            <>
                                                                <button onClick={() => toggleReveal(item.id)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition" title={isRevealed ? 'Hide Password' : 'Show Password'}>
                                                                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                                                </button>
                                                                <button onClick={() => copyToClipboard(item.password, 'password', item.id)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition border border-white/10" title="Copy Password">
                                                                    {copiedId === `password-${item.id}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                                                                </button>
                                                            </>
                                                        )}
                                                        <button onClick={() => handleOpenEditForm(item)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition" title="Edit Item">
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button onClick={() => handleDeleteItem(item.id, item.title)} className="p-1.5 rounded-xl hover:bg-red-500/20 text-white/50 hover:text-red-400 transition" title="Delete Item">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Secret / Passkey Info Row */}
                                                {item.itemType === 'passkey' ? (
                                                    <div className="flex items-center justify-between text-[10px] font-mono bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl text-purple-300">
                                                        <span>Passkey Domain: {item.passkeyData?.rpId || item.url || 'WebAuthn'}</span>
                                                        <button onClick={() => copyToClipboard(item.passkeyData?.credentialId || item.id, 'passkey credential', item.id)} className="text-[9px] underline hover:text-white">
                                                            {copiedId === `passkey credential-${item.id}` ? 'Copied' : 'Copy Credential'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                                                        <span className="text-white/80 truncate">
                                                            {isRevealed ? item.password : '••••••••••••'}
                                                        </span>
                                                        {item.url && (
                                                            <span className="text-[9px] text-white/30 truncate max-w-[120px]">
                                                                {item.url.replace(/^https?:\/\//, '')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
