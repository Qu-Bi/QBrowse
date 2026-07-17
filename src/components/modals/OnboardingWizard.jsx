import React, { useState } from 'react';
import { Globe, User, ShieldCheck, Monitor, CheckCircle, X, UserPlus, ArrowRight, Lock, Zap, Loader } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useSyncStore from '../../store/useSyncStore';
import useTabStore from '../../store/useTabStore';

const OnboardingWizard = () => {
    const {
        activeModal,
        isModalClosing,
        closeModal,
        onboardingStep,
        setOnboardingStep,
        obUsername: obEmail,
        setObUsername: setObEmail,
        obPassword,
        setObPassword
    } = useUIStore();

    const { signUp, isSyncing, authError } = useSyncStore();
    const pinnedTabs = useTabStore(state => state.pinnedTabs);
    const setPinnedTabs = useTabStore(state => state.setPinnedTabs);
    const [loginMode, setLoginMode] = useState(false);

    if (activeModal !== 'onboarding' && !isModalClosing) return null;

    return (
        <div className={`absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-3xl text-white font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-pop-in duration-500'}`} onClick={closeModal}>
            <div className="w-full max-w-[900px] h-[600px] bg-[#0a0a0c]/80 border border-white/10 rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex transition-all duration-500" onClick={e => e.stopPropagation()}>

                {/* Lewy Pasek: Postęp */}
                <div className="w-64 bg-black/40 border-r border-white/5 p-8 flex flex-col relative z-20">
                    <h2 className="text-2xl font-black text-white mb-10 tracking-tight flex items-center gap-2"><Globe className="text-accent" size={24} /> QBrowse</h2>
                    <div className="flex flex-col gap-6 relative flex-1">
                        <div className="absolute left-[11px] top-4 bottom-8 w-px bg-white/10"></div>
                        {[
                            { id: 0, label: 'Local Profile', icon: User },
                            { id: 1, label: 'Encryption', icon: ShieldCheck },
                            { id: 2, label: 'Desktop Sync', icon: Monitor },
                            { id: 3, label: 'Personalize', icon: Zap },
                            { id: 4, label: 'Ready', icon: CheckCircle }
                        ].map(step => (
                            <div key={step.id} className={`flex items-center gap-4 relative z-10 transition-colors duration-500 ${onboardingStep >= step.id ? 'text-accent' : 'text-white/30'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${onboardingStep >= step.id ? 'bg-accent text-black shadow-[0_0_15px_var(--accent-30)]' : 'bg-[#1a1a1c] border border-white/10'}`}>
                                    <step.icon size={12} />
                                </div>
                                <span className={`text-sm font-bold tracking-wide ${onboardingStep === step.id ? 'text-white' : ''}`}>{step.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Prawy Kontener: Przewijane Slajdy */}
                <div className="flex-1 relative overflow-hidden bg-[#121214]">
                    {/* Ambient Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--accent-10),transparent_70%)] pointer-events-none"></div>

                    <button onClick={closeModal} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition z-50 text-white/50 hover:text-white"><X size={16} /></button>

                    <div className="absolute inset-y-0 left-0 w-[500%] flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(-${onboardingStep * 20}%)` }}>

                        {/* Krok 0: Profil Lokalny / Cloud Sync */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-6 text-white/60"><UserPlus size={32} /></div>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Cloud Sync.</h3>
                            <p className="text-sm text-white/50 mb-6 leading-relaxed max-w-md">Connect to Firebase to seamlessly sync your Vault, settings, and tabs across devices.</p>

                            <div className="flex flex-col gap-2 mb-8">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Email Address</label>
                                <input type="email" value={obEmail} onChange={e => setObEmail(e.target.value)} placeholder="hello@example.com" className="w-full max-w-sm bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-lg text-white outline-none focus:border-accent/50 focus:shadow-[0_0_30px_var(--accent-20)] transition-all" />
                            </div>

                            <button onClick={() => setOnboardingStep(1)} disabled={!obEmail.trim() || !obEmail.includes('@')} className="px-8 py-4 bg-accent text-black rounded-2xl font-bold self-start hover:scale-105 transition-transform shadow-[0_10px_20px_var(--accent-20)] disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2">
                                Continue <ArrowRight size={16} />
                            </button>
                        </div>

                        {/* Krok 1: Master Password */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-6 text-emerald-400"><Lock size={32} /></div>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Secure your Vault.</h3>
                            <p className="text-sm text-white/50 mb-10 leading-relaxed max-w-md">Set a Master Password for your local passwords and AI context. It encrypts your SQLite database locally. We cannot recover it.</p>

                            <div className="flex flex-col gap-2 mb-8">
                                <input type="password" value={obPassword} onChange={e => setObPassword(e.target.value)} placeholder="Master Password" className="w-full max-w-sm bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-lg text-white outline-none focus:border-emerald-500/50 focus:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all" />
                                <div className="flex gap-2 mt-2 w-full max-w-sm">
                                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${obPassword.length > 0 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/10'}`}></div>
                                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${obPassword.length > 5 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-white/10'}`}></div>
                                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${obPassword.length > 8 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}></div>
                                </div>
                                <span className="text-[10px] font-mono text-white/30 mt-1 uppercase">Strength Meter</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={() => setOnboardingStep(0)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors">Back</button>
                                <button onClick={async () => {
                                    const success = loginMode 
                                        ? await useSyncStore.getState().signIn(obEmail, obPassword)
                                        : await signUp(obEmail, obPassword);
                                    if (success) setOnboardingStep(2);
                                }} disabled={obPassword.length < 6 || isSyncing} className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-[0_10px_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2">
                                    {isSyncing ? <Loader size={16} className="animate-spin" /> : <>{loginMode ? 'Sign In' : 'Create Account'} & Encrypt</>} <ShieldCheck size={16} />
                                </button>
                            </div>
                            
                            {authError && <p className="text-red-400 text-xs mt-4 max-w-sm">{authError}</p>}
                            <p className="text-xs text-white/40 mt-4 cursor-pointer hover:text-white transition" onClick={() => setLoginMode(!loginMode)}>
                                {loginMode ? "Need an account? Sign up" : "Already have an account? Sign in"}
                            </p>
                        </div>

                        {/* Krok 2: Desktop Sync */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-6 text-blue-400"><Monitor size={32} /></div>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Desktop Sync.</h3>
                            <p className="text-sm text-white/50 mb-8 leading-relaxed max-w-md">Sync your workspace and Vault securely across Windows and Linux. Generate a pairing code to link another QBrowse instance via E2EE.</p>

                            <div className="flex flex-col gap-5 mb-8 w-full max-w-sm">
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80 mb-2">Your Device Code</span>
                                    <span className="text-xl font-mono tracking-widest text-blue-400 font-bold bg-black/40 px-4 py-2 rounded-xl border border-blue-500/30">QB-8X91-FZ42</span>
                                </div>

                                <div className="flex items-center gap-4 w-full">
                                    <div className="h-px flex-1 bg-white/10"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">OR</span>
                                    <div className="h-px flex-1 bg-white/10"></div>
                                </div>

                                <input type="text" placeholder="Enter code from another PC" className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-center text-sm font-mono text-white outline-none focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all" />
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setOnboardingStep(1)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors">Back</button>
                                <button onClick={() => setOnboardingStep(3)} className="px-8 py-4 bg-blue-500 text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-[0_10px_20px_rgba(59,130,246,0.3)] flex items-center gap-2">
                                    Next Step <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Krok 3: Personalize */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-6 text-accent"><Zap size={32} /></div>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Make it yours.</h3>
                            <p className="text-sm text-white/50 mb-6 leading-relaxed max-w-md">Pin your favorite sites so your sidebar isn't empty, and choose your accent color.</p>

                            <div className="flex flex-col gap-3 mb-6">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Suggested Pins</span>
                                <div className="flex gap-3 flex-wrap max-w-md">
                                    {[
                                        { title: 'YouTube', domain: 'youtube.com' },
                                        { title: 'GitHub', domain: 'github.com' },
                                        { title: 'ChatGPT', domain: 'chatgpt.com' },
                                        { title: 'X', domain: 'x.com' }
                                    ].map(site => {
                                        return (
                                            <button 
                                                key={site.domain}
                                                onClick={() => {
                                                    const isPinned = pinnedTabs.some(p => p.domain === site.domain);
                                                    if (!isPinned) {
                                                        setPinnedTabs([...pinnedTabs, { id: `p-${Date.now()}-${Math.random()}`, title: site.title, domain: site.domain }]);
                                                    } else {
                                                        setPinnedTabs(pinnedTabs.filter(p => p.domain !== site.domain));
                                                    }
                                                }}
                                                className={`px-4 py-2 bg-black/40 hover:bg-white/10 border rounded-xl text-xs font-semibold hover:text-white transition flex items-center gap-2 shadow-sm ${pinnedTabs.some(p => p.domain === site.domain) ? 'border-accent text-accent ring-1 ring-accent/50' : 'border-white/10 text-white/80'}`}
                                            >
                                                <img src={`https://www.google.com/s2/favicons?sz=64&domain=${site.domain}`} className={`w-4 h-4 rounded-sm ${pinnedTabs.some(p => p.domain === site.domain) ? '' : 'grayscale opacity-80'}`} />
                                                {site.title}
                                                {pinnedTabs.some(p => p.domain === site.domain) && <CheckCircle size={12} className="ml-1" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 mb-8">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Theme Color</span>
                                <div className="flex gap-3">
                                    {['#3b82f6', '#10b981', '#d4bc94', '#a855f7', '#ef4444'].map(color => (
                                        <button 
                                            key={color}
                                            onClick={() => useUIStore.getState().setAccentColor(color)}
                                            className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform shadow-md"
                                            style={{ backgroundColor: color, borderColor: useUIStore.getState().accentColor === color ? 'white' : 'transparent' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setOnboardingStep(2)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors">Back</button>
                                <button onClick={() => setOnboardingStep(4)} className="px-8 py-4 bg-accent text-black rounded-2xl font-bold hover:scale-105 transition-transform shadow-[0_10px_20px_var(--accent-30)] flex items-center gap-2">
                                    Finish Setup <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Krok 4: Launch */}
                        <div className="w-1/5 h-full p-12 flex flex-col items-center justify-center relative text-center">
                            <div className="w-24 h-24 bg-accent-10 rounded-full flex items-center justify-center border border-accent-20 mb-8 animate-pulse text-accent"><CheckCircle size={48} /></div>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">You're all set.</h3>
                            <p className="text-sm text-white/50 mb-10 leading-relaxed max-w-md">Your profile is secure and syncing to Firebase. Engine is primed. Welcome to the future of browsing.</p>

                            <button onClick={() => {
                                useUIStore.getState().setSetupComplete(true);
                                closeModal();
                                useUIStore.getState().showToast("Welcome to QBrowse Sync!");
                            }} className="px-10 py-5 bg-accent text-black rounded-3xl text-lg font-black tracking-wide hover:scale-110 transition-transform shadow-[0_15px_30px_var(--accent-30)] flex items-center gap-3">
                                Launch QBrowse <Zap size={20} />
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
