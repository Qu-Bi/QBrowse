import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertCircle, HelpCircle, Terminal, Lock, User, Eye, EyeOff, X } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function BrowserDialogOverlay() {
    const activeDialog = useUIStore(state => state.activeDialog);
    const closeActiveDialog = useUIStore(state => state.closeActiveDialog);
    const theme = useUIStore(state => state.theme);
    const isBright = theme === 'light';

    const [inputValue, setInputValue] = useState('');
    const [authUsername, setAuthUsername] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [suppressDialogs, setSuppressDialogs] = useState(false);

    const inputRef = useRef(null);
    const usernameRef = useRef(null);

    useEffect(() => {
        if (!activeDialog) {
            setInputValue('');
            setAuthUsername('');
            setAuthPassword('');
            setShowPassword(false);
            setSuppressDialogs(false);
            return;
        }

        if (activeDialog.type === 'prompt') {
            setInputValue(activeDialog.defaultValue || '');
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 60);
        } else if (activeDialog.type === 'auth') {
            setTimeout(() => {
                if (usernameRef.current) {
                    usernameRef.current.focus();
                }
            }, 60);
        }
    }, [activeDialog]);

    // Handle Escape and Enter keyboard navigation
    useEffect(() => {
        if (!activeDialog) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                handleCancel();
            } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
                e.preventDefault();
                e.stopPropagation();
                handleConfirm();
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [activeDialog, inputValue, authUsername, authPassword, suppressDialogs]);

    if (!activeDialog) return null;

    const { type, message, hostname, origin, realm, hasRepeatSpam, onConfirm, onCancel } = activeDialog;

    const handleConfirm = () => {
        if (suppressDialogs && origin) {
            try {
                sessionStorage.setItem('qbrowse_suppress_dialogs_' + origin, 'true');
            } catch (_) {}
            if (activeDialog.webview && typeof activeDialog.webview.send === 'function') {
                activeDialog.webview.send('qbrowse-suppress-dialogs', { origin });
            }
        }

        if (type === 'auth') {
            if (typeof onConfirm === 'function') {
                onConfirm(authUsername, authPassword);
            }
        } else if (type === 'prompt') {
            if (typeof onConfirm === 'function') {
                onConfirm(inputValue);
            }
        } else {
            if (typeof onConfirm === 'function') {
                onConfirm(true);
            }
        }
        closeActiveDialog();
    };

    const handleCancel = () => {
        if (typeof onCancel === 'function') {
            onCancel();
        }
        closeActiveDialog();
    };

    const getIcon = () => {
        switch (type) {
            case 'auth':
                return <Lock size={15} className="text-amber-400" />;
            case 'confirm':
                return <HelpCircle size={15} className="text-blue-400" />;
            case 'prompt':
                return <Terminal size={15} className="text-emerald-400" />;
            default:
                return <AlertCircle size={15} className="text-accent" />;
        }
    };

    const getTitle = () => {
        if (type === 'auth') return 'Authentication Required';
        if (type === 'prompt') return 'Input Requested';
        if (type === 'confirm') return 'Confirm Action';
        return 'Alert';
    };

    return (
        <div 
            className="absolute inset-0 z-[80] flex justify-center items-start pt-16 pb-8 px-4 pointer-events-auto bg-black/20 backdrop-blur-[2px] animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    if (type === 'alert') handleConfirm();
                    else handleCancel();
                }
            }}
        >
            <div 
                className={`relative w-full max-w-md rounded-2xl overflow-hidden border transition-all duration-300 animate-pop-in p-5 flex flex-col gap-4 ${
                    isBright 
                        ? 'bg-white/75 backdrop-blur-3xl border-black/[0.08] text-zinc-900 shadow-[0_24px_70px_rgba(0,0,0,0.12),0_0_1px_1px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.9)]' 
                        : 'bg-[#0c0d14]/78 backdrop-blur-3xl border-white/[0.08] text-white shadow-[0_25px_80px_rgba(0,0,0,0.7),0_0_1px_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Ambient Glowing Highlights matching ToolHub & AuthModal */}
                <div className="absolute top-0 right-0 w-64 h-44 bg-accent/25 rounded-full blur-2xl pointer-events-none opacity-80" />
                <div className="absolute bottom-0 left-0 w-56 h-36 bg-accent/15 rounded-full blur-2xl pointer-events-none opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none rounded-2xl" />

                {/* Header: Domain Badge & Type (Unified with zero dividers) */}
                <div className="relative z-10 flex justify-between items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-accent/15 text-accent border border-accent/25 shadow-[0_0_10px_var(--accent-20)]">
                            {getIcon()}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs font-semibold tracking-tight truncate ${isBright ? 'text-zinc-900' : 'text-white/90'}`}>
                                {hostname || origin || 'Website'}
                            </span>
                            <span className={`text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md ${
                                isBright ? 'text-zinc-500 bg-black/[0.04]' : 'text-white/50 bg-white/[0.05]'
                            }`}>
                                {getTitle()}
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={handleCancel}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer ${
                            isBright ? 'hover:bg-black/5 text-zinc-400 hover:text-zinc-900' : 'hover:bg-white/10 text-white/40 hover:text-white'
                        }`}
                        title="Close (Esc)"
                    >
                        <X size={13} />
                    </button>
                </div>

                {/* Message & Body Content */}
                <div className="relative z-10 flex flex-col gap-3">
                    {message && (
                        <p className={`text-xs leading-relaxed break-words font-medium max-h-48 overflow-y-auto hide-scroll ${
                            isBright ? 'text-zinc-700' : 'text-zinc-200'
                        }`}>
                            {message}
                        </p>
                    )}

                    {type === 'auth' && (
                        <div className="space-y-2.5">
                            {realm && (
                                <p className={`text-[11px] italic ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    "{realm}"
                                </p>
                            )}
                            <div className="space-y-2">
                                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
                                    isBright ? 'bg-black/[0.03] border-black/10 focus-within:border-accent' : 'bg-black/40 border-white/10 focus-within:border-accent'
                                }`}>
                                    <User size={13} className="text-[color:var(--sidebar-text-muted)] flex-shrink-0" />
                                    <input 
                                        ref={usernameRef}
                                        type="text"
                                        value={authUsername}
                                        onChange={(e) => setAuthUsername(e.target.value)}
                                        placeholder="Username"
                                        className="bg-transparent text-xs w-full outline-none font-sans"
                                    />
                                </div>
                                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
                                    isBright ? 'bg-black/[0.03] border-black/10 focus-within:border-accent' : 'bg-black/40 border-white/10 focus-within:border-accent'
                                }`}>
                                    <Lock size={13} className="text-[color:var(--sidebar-text-muted)] flex-shrink-0" />
                                    <input 
                                        type={showPassword ? 'text' : 'password'}
                                        value={authPassword}
                                        onChange={(e) => setAuthPassword(e.target.value)}
                                        placeholder="Password"
                                        className="bg-transparent text-xs w-full outline-none font-sans"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-[color:var(--sidebar-text-muted)] hover:text-accent transition cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {type === 'prompt' && (
                        <div className={`flex items-center px-4 py-3 rounded-xl border transition-all ${
                            isBright 
                                ? 'bg-black/[0.03] border-black/10 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30 text-zinc-900 shadow-sm' 
                                : 'bg-white/[0.04] border border-white/10 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40 focus-within:shadow-[0_0_20px_var(--accent-30)] text-white'
                        }`}>
                            <input 
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Your response..."
                                className="bg-transparent text-sm w-full outline-none font-sans"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Anti-spam Repeat Protection Checkbox */}
                    {hasRepeatSpam && (
                        <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={suppressDialogs}
                                onChange={(e) => setSuppressDialogs(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border border-white/20 accent-accent cursor-pointer"
                            />
                            <span className="text-[11px] text-[color:var(--sidebar-text-muted)]">
                                Prevent this page from creating additional dialogs
                            </span>
                        </label>
                    )}
                </div>

                {/* Footer Buttons (Seamless inline without divider lines) */}
                <div className="relative z-10 flex items-center justify-end gap-2 pt-1">
                    {type !== 'alert' && (
                        <button 
                            type="button"
                            onClick={handleCancel}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer border ${
                                isBright 
                                    ? 'bg-black/5 hover:bg-black/10 text-zinc-700 border-black/10' 
                                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-white/80 hover:text-white border-white/10'
                            }`}
                        >
                            Cancel
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={handleConfirm}
                        className="px-5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-lg bg-accent text-zinc-950 hover:brightness-110 shadow-[0_0_20px_var(--accent-30)] hover:shadow-[0_0_25px_var(--accent-40)] hover:scale-[1.02]"
                    >
                        {type === 'auth' ? 'Sign In' : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
}
