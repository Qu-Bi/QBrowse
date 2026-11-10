import React, { useState, useEffect } from 'react';
import { Languages, Sparkles, Check, Globe } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import LanguageFlag from './LanguageFlag';

const GLYPH_BURST = [
    { char: '文', vx: '280px',  vy: '-200px', rot: '28deg',  delay: '0.02s' },
    { char: 'Ω',  vx: '-320px', vy: '-180px', rot: '-35deg', delay: '0.04s' },
    { char: 'あ', vx: '340px',  vy: '140px',  rot: '20deg',  delay: '0.06s' },
    { char: 'Я',  vx: '-260px', vy: '220px',  rot: '-25deg', delay: '0.03s' },
    { char: '가', vx: '180px',  vy: '320px',  rot: '15deg',  delay: '0.07s' },
    { char: 'ñ',  vx: '-360px', vy: '40px',   rot: '-40deg', delay: '0.05s' },
    { char: 'ą',  vx: '220px',  vy: '-300px', rot: '32deg',  delay: '0.08s' },
    { char: 'A',  vx: '-180px', vy: '-280px', rot: '-18deg', delay: '0.01s' },
    { char: 'é',  vx: '380px',  vy: '-60px',  rot: '42deg',  delay: '0.09s' },
    { char: 'ß',  vx: '-120px', vy: '340px',  rot: '-22deg', delay: '0.05s' }
];

export default function LanguageWarpOverlay() {
    const [warpData, setWarpData] = useState(null);
    const [isExiting, setIsExiting] = useState(false);

    const isReducedMotion = useUIStore(state => 
        Boolean(state.settings?.a11yReducedMotion || state.isSystemReducedMotion)
    );

    useEffect(() => {
        const handleWarp = (e) => {
            const data = e.detail;
            if (!data) return;

            setWarpData(data);
            setIsExiting(false);

            // Extended duration to match the full swell and cathedral reverberation of the pipe organ chord
            const displayDuration = isReducedMotion ? 400 : 2400;
            const exitTimer = setTimeout(() => {
                setIsExiting(true);
            }, displayDuration);

            const removeTimer = setTimeout(() => {
                setWarpData(null);
                setIsExiting(false);
            }, displayDuration + 400);

            return () => {
                clearTimeout(exitTimer);
                clearTimeout(removeTimer);
            };
        };

        window.addEventListener('qbrowse-language-warp', handleWarp);
        return () => window.removeEventListener('qbrowse-language-warp', handleWarp);
    }, [isReducedMotion]);

    if (!warpData) return null;

    const meta = warpData.meta || {};

    return (
        <div 
            className={`fixed inset-0 z-[999999] pointer-events-none flex items-center justify-center overflow-hidden transition-all duration-350 ${
                isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            }`}
            style={{ perspective: '1400px' }}
        >
            {/* 1. Backdrop Ambient Dimming Veil */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[6px] animate-fade-in" />

            {/* 2. Instant Golden Singularity Flash on Pipe Organ Strike */}
            {!isReducedMotion && (
                <div 
                    className="absolute inset-0 pointer-events-none animate-lang-flash"
                    style={{
                        background: 'radial-gradient(circle at center, rgba(255, 230, 160, 0.45) 0%, rgba(var(--accent-rgb, 212, 188, 148), 0.20) 40%, transparent 75%)'
                    }}
                />
            )}

            {/* 3. Primary & Secondary Expanding Chromatic Shockwaves */}
            {!isReducedMotion && (
                <>
                    <div 
                        className="absolute w-[700px] h-[700px] rounded-full pointer-events-none animate-lang-shockwave"
                        style={{
                            background: 'radial-gradient(circle, rgba(var(--accent-rgb, 212, 188, 148), 0.45) 0%, rgba(var(--accent-rgb, 212, 188, 148), 0.12) 40%, transparent 70%)',
                            boxShadow: '0 0 80px rgba(var(--accent-rgb, 212, 188, 148), 0.35)'
                        }}
                    />
                    <div 
                        className="absolute w-[850px] h-[850px] rounded-full pointer-events-none border-2 border-accent/40 animate-lang-shockwave-2"
                        style={{
                            boxShadow: 'inset 0 0 40px rgba(var(--accent-rgb, 212, 188, 148), 0.25), 0 0 60px rgba(var(--accent-rgb, 212, 188, 148), 0.3)'
                        }}
                    />
                </>
            )}

            {/* 4. 3D Floating Polyglot Script Glyphs bursting into deep space */}
            {!isReducedMotion && GLYPH_BURST.map((g, idx) => (
                <span
                    key={idx}
                    className="absolute font-serif text-3xl font-extrabold text-accent/80 drop-shadow-[0_0_12px_rgba(var(--accent-rgb,212,188,148),0.7)] pointer-events-none animate-lang-glyph select-none"
                    style={{
                        '--flight-vector': `translate(${g.vx}, ${g.vy})`,
                        '--flight-rot': g.rot,
                        animationDelay: g.delay
                    }}
                >
                    {g.char}
                </span>
            ))}

            {/* 5. Monumental 3D Floating Liquid Glass Monolith */}
            <div 
                className={`relative z-10 flex flex-col items-center justify-center p-8 sm:p-10 rounded-[32px] border transition-all duration-300 overflow-hidden ${
                    isReducedMotion 
                        ? 'animate-fade-in bg-[#0c0e17]/95 border-white/20' 
                        : 'animate-lang-portal bg-gradient-to-b from-[#161a2e]/95 via-[#0b0d17]/98 to-[#181d33]/95 border-white/30 shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_80px_rgba(var(--accent-rgb,212,188,148),0.35)]'
                }`}
                style={{
                    minWidth: '380px',
                    maxWidth: '92vw'
                }}
            >
                {/* Holographic Specular Reflection Sweep */}
                {!isReducedMotion && (
                    <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none animate-lang-holoscan" />
                )}

                {/* Glowing Outer Rim Halo */}
                <div className="absolute -inset-1 rounded-[34px] bg-gradient-to-r from-accent/40 via-white/25 to-accent/40 blur-md pointer-events-none opacity-90" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                    {/* Top Vector Flag Shield & Holographic Badge */}
                    <div className="relative flex items-center justify-center">
                        <div className="p-3 rounded-2xl bg-black/50 border border-white/20 flex items-center justify-center shadow-[inset_0_2px_15px_rgba(0,0,0,0.6)] relative overflow-hidden group">
                            <LanguageFlag code={meta.id} className="w-20 h-14 rounded-lg shadow-xl" />
                            {!isReducedMotion && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 via-transparent to-white/25 animate-pulse pointer-events-none" />
                            )}
                        </div>

                        {/* Floating Polyglot Tag */}
                        <div className="absolute -bottom-2.5 -right-3 px-2.5 py-1 rounded-full bg-accent text-zinc-950 font-extrabold text-[11px] shadow-lg flex items-center gap-1.5 border border-white/40 tracking-wider">
                            <Languages size={12} strokeWidth={2.5} />
                            <span>{meta.id?.toUpperCase() || 'EN'}</span>
                        </div>
                    </div>

                    {/* Language Native Name in Majestic Letterspacing */}
                    <div className="space-y-1.5 pt-1">
                        <h2 className="text-3xl sm:text-4xl font-black tracking-wider text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] font-sans uppercase">
                            {meta.name || 'Language'}
                        </h2>
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-white/70 tracking-wide">
                            <span>{meta.englishName}</span>
                            <span>•</span>
                            <span className="text-accent">{meta.region}</span>
                        </div>
                    </div>

                    {/* Native Greeting Banner with Ambient Accent Halo */}
                    <div className="px-5 py-2 rounded-2xl bg-accent/20 border border-accent/50 text-accent font-bold text-sm shadow-[0_0_20px_rgba(var(--accent-rgb,212,188,148),0.2)] flex items-center gap-2 mt-1">
                        <Sparkles size={15} className="text-accent shrink-0 animate-spin-slow" />
                        <span className="italic tracking-normal text-white drop-shadow">
                            &ldquo;{meta.greeting || 'Welcome!'}&rdquo;
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
