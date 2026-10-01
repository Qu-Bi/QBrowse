import React, { useState, useEffect } from 'react';
import useUIStore from '../../store/useUIStore';
import { playBootWelcomeChime } from '../../utils/bootAudio';

export default function BootCurtain({ onFinish }) {
    const isFirstBoot = useUIStore(state => state.isFirstBoot);
    const completeFirstBoot = useUIStore(state => state.completeFirstBoot);
    const playStartupSoundSetting = useUIStore(state => state.settings?.playStartupSound ?? false);

    const [phase, setPhase] = useState('entering'); // 'entering' | 'holding' | 'blooming' | 'done'

    useEffect(() => {
        // Play chime on first startup or if user has explicitly enabled startup sound
        if (isFirstBoot || playStartupSoundSetting) {
            playBootWelcomeChime();
        }

        if (isFirstBoot) {
            // First startup post-install: ~1.8s cinematic sequence
            const t1 = setTimeout(() => setPhase('holding'), 350);
            const t2 = setTimeout(() => setPhase('blooming'), 1400);
            const t3 = setTimeout(() => {
                setPhase('done');
                completeFirstBoot();
                if (onFinish) onFinish();
            }, 1800);
            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(t3);
            };
        } else {
            // Daily startup: ultra-snappy ~650ms hardware-accelerated transition
            const t1 = setTimeout(() => setPhase('holding'), 100);
            const t2 = setTimeout(() => setPhase('blooming'), 320);
            const t3 = setTimeout(() => {
                setPhase('done');
                if (onFinish) onFinish();
            }, 650);
            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(t3);
            };
        }
    }, [isFirstBoot, playStartupSoundSetting, completeFirstBoot, onFinish]);

    if (phase === 'done') return null;

    const isBlooming = phase === 'blooming';

    return (
        <div 
            id="qbrowse-boot-curtain"
            className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#07080a] select-none pointer-events-auto transition-opacity duration-350 ease-out ${
                isBlooming ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
        >
            {/* Ambient Radial Core Glow (100% GPU-accelerated gradient, zero CPU blur filters) */}
            <div 
                className={`absolute w-[420px] h-[420px] rounded-full pointer-events-none transition-all duration-500 ease-out ${
                    isBlooming ? 'scale-125 opacity-0' : 'scale-100 opacity-70'
                }`}
                style={{
                    background: 'radial-gradient(circle, rgba(212,188,148,0.22) 0%, rgba(212,188,148,0.06) 40%, transparent 68%)',
                    transform: 'translateZ(0)',
                    willChange: 'opacity, transform'
                }}
            />

            {/* Glowing Minimalist Q Emblem */}
            <div className="relative flex flex-col items-center justify-center" style={{ transform: 'translateZ(0)' }}>
                <div 
                    className={`relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center transition-all duration-400 ease-out ${
                        phase === 'entering' 
                            ? 'scale-95 opacity-80' 
                            : isBlooming 
                                ? 'scale-110 opacity-0' 
                                : 'scale-100 opacity-100'
                    }`}
                    style={{ willChange: 'opacity, transform' }}
                >
                    {/* Official QBrowse Emblem */}
                    <img 
                        src="/icon.png" 
                        alt="QBrowse" 
                        className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(212,188,148,0.55)]"
                    />
                </div>

                {/* First-Launch Subtitle & Brand Tagline */}
                {isFirstBoot && (
                    <div 
                        className={`mt-6 text-center transition-all duration-700 ease-out ${
                            phase === 'entering' 
                                ? 'opacity-0 translate-y-3' 
                                : isBlooming 
                                    ? 'opacity-0 -translate-y-2' 
                                    : 'opacity-100 translate-y-0'
                        }`}
                    >
                        <h1 className="text-white text-base md:text-lg font-bold tracking-tight">
                            Q<span className="text-accent">Browse</span>
                        </h1>
                        <p className="text-white/40 text-xs font-medium tracking-widest uppercase mt-1">
                            Welcome to Private Browsing
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
