import React, { useState } from 'react';
import { Sparkles, Globe, Laptop } from 'lucide-react';
import { SUPPORTED_LANGUAGES, useTranslation, getSystemLanguage } from '../../i18n/index';
import LanguageFlag from './LanguageFlag';

// Zero-gravity perimeter drift trajectories for the 12 polyglot celestial bodies
// Evenly distributed along the outer ring to prevent any overlap with text or the center node
const ORBIT_NODES = [
    // Top Row (Spread wide across outer corners, leaving center 30-70% completely open)
    { id: 'en', x: '16%', y: '22%', dx: '8px',  dy: '-12px', r: '2.5deg',  dur: '6.2s', delay: '0s' },
    { id: 'pl', x: '28%', y: '16%', dx: '-10px', dy: '8px',   r: '-3deg',   dur: '5.8s', delay: '0.4s' },
    { id: 'fr', x: '72%', y: '16%', dx: '10px',  dy: '8px',   r: '2deg',    dur: '6.5s', delay: '0.8s' },
    { id: 'de', x: '84%', y: '22%', dx: '-8px',  dy: '-10px', r: '-2.5deg', dur: '5.5s', delay: '0.2s' },

    // Middle Flanks
    { id: 'es', x: '10%', y: '50%', dx: '10px',  dy: '10px',  r: '3deg',    dur: '6.8s', delay: '0.6s' },
    { id: 'ru', x: '22%', y: '50%', dx: '-8px',  dy: '-8px',  r: '-2deg',   dur: '5.7s', delay: '0.5s' },
    { id: 'it', x: '78%', y: '50%', dx: '8px',   dy: '8px',   r: '2deg',    dur: '6.6s', delay: '0.9s' },
    { id: 'ja', x: '90%', y: '50%', dx: '-10px', dy: '-10px', r: '-3deg',   dur: '6.4s', delay: '0.7s' },

    // Bottom Row
    { id: 'pt', x: '16%', y: '78%', dx: '-8px',  dy: '-10px', r: '-2.5deg', dur: '5.9s', delay: '1.0s' },
    { id: 'uk', x: '32%', y: '82%', dx: '8px',   dy: '10px',  r: '2.5deg',  dur: '5.6s', delay: '0.1s' },
    { id: 'ko', x: '68%', y: '82%', dx: '-8px',  dy: '-8px',  r: '-2.5deg', dur: '6.3s', delay: '0.4s' },
    { id: 'zh', x: '84%', y: '78%', dx: '10px',  dy: '-8px',  r: '3deg',    dur: '6.1s', delay: '0.3s' }
];

export default function ZeroGravityLanguageOrbit({ 
    variant = 'fullscreen', // 'fullscreen' | 'embedded'
    onSelect
}) {
    const { 
        t, 
        currentLanguage, 
        resolvedLanguage, 
        isAuto, 
        setLanguage 
    } = useTranslation();

    const [hoveredLangId, setHoveredLangId] = useState(null);
    const systemLangCode = getSystemLanguage();
    const systemLang = SUPPORTED_LANGUAGES.find(l => l.id === systemLangCode) || SUPPORTED_LANGUAGES[0];

    const handlePick = (code) => {
        setLanguage(code);
        if (onSelect) {
            onSelect(code);
        }
    };

    const isFullscreen = variant === 'fullscreen';

    return (
        <div 
            className={`relative w-full overflow-hidden select-none transition-all flex flex-col items-center justify-center ${
                isFullscreen 
                    ? 'min-h-[580px] h-full flex-1 rounded-3xl bg-[#07080f]' 
                    : 'h-[360px] rounded-3xl border border-white/10 bg-gradient-to-b from-[#090b14]/95 via-[#06070c]/98 to-[#0a0d18]/95 shadow-2xl'
            }`}
        >
            {/* Deep Cosmic Background & Ambient Starlight */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                    backgroundImage: 'radial-gradient(1.5px 1.5px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 40px 70px, rgba(255,255,255,0.7), rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 160px 120px, rgba(212,188,148,0.8), rgba(0,0,0,0))',
                    backgroundRepeat: 'repeat',
                    backgroundSize: '240px 240px'
                }}
            />

            {/* Central Ambient Nebular Aura */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[340px] rounded-full blur-[100px] pointer-events-none opacity-20"
                style={{ background: 'radial-gradient(circle, var(--accent, #d4bc94) 0%, transparent 70%)' }}
            />

            {/* Title for Fullscreen Setup Journey only */}
            {isFullscreen && (
                <div className="absolute top-10 inset-x-0 z-20 flex flex-col items-center text-center pointer-events-none px-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-accent drop-shadow flex items-center gap-2">
                        <Sparkles size={13} className="text-accent" />
                        <span>Choose your language</span>
                    </span>
                </div>
            )}

            {/* Floating Celestial Core: Auto / OS Sync Node */}
            <div className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <button
                    type="button"
                    onClick={() => handlePick('auto')}
                    className={`group relative px-5 py-2.5 rounded-full border transition-all duration-300 flex items-center gap-2.5 cursor-pointer backdrop-blur-xl ${
                        isAuto
                            ? 'bg-accent text-zinc-950 font-extrabold border-accent/80 shadow-[0_0_30px_rgba(var(--accent-rgb,212,188,148),0.4)] scale-105'
                            : 'bg-black/60 hover:bg-black/80 text-white/90 hover:text-white border-white/15 hover:border-accent/50 shadow-xl hover:scale-105'
                    }`}
                >
                    <div className={`w-2 h-2 rounded-full ${isAuto ? 'bg-zinc-950 animate-ping' : 'bg-emerald-400'}`} />
                    <Laptop size={14} className={isAuto ? 'text-zinc-950' : 'text-accent'} />
                    <span className="text-xs tracking-wide">
                        {isAuto ? `System Auto (${systemLang.name})` : `Sync with OS (${systemLang.name})`}
                    </span>
                    <LanguageFlag code={systemLang.id} className="w-4.5 h-3 rounded-[2px]" shadow={false} />
                </button>

                {/* Subtle Hover Tooltip under Center */}
                {hoveredLangId && (
                    <div className="absolute top-12 flex flex-col items-center text-center animate-fade-in pointer-events-none whitespace-nowrap z-30">
                        {(() => {
                            const meta = SUPPORTED_LANGUAGES.find(l => l.id === hoveredLangId);
                            if (!meta) return null;
                            return (
                                <div className="px-3.5 py-1 rounded-full bg-black/85 border border-white/20 text-white shadow-2xl backdrop-blur-md flex items-center gap-2">
                                    <span className="text-xs font-bold text-accent">{meta.name}</span>
                                    <span className="text-[11px] text-white/70 italic">&ldquo;{meta.greeting}&rdquo;</span>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* 12 Zero-Gravity Floating Flag Constellations */}
            <div className="absolute inset-0 pointer-events-none">
                {ORBIT_NODES.map((node) => {
                    const meta = SUPPORTED_LANGUAGES.find(l => l.id === node.id);
                    if (!meta) return null;

                    const isSelected = (!isAuto && currentLanguage === meta.id) || (isAuto && resolvedLanguage === meta.id);
                    const isHovered = hoveredLangId === meta.id;

                    return (
                        <div
                            key={meta.id}
                            className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: node.x,
                                top: node.y,
                                zIndex: isHovered ? 40 : (isSelected ? 30 : 10)
                            }}
                        >
                            <div
                                className="animate-zero-gravity"
                                style={{
                                    '--drift-x': node.dx,
                                    '--drift-y': node.dy,
                                    '--drift-r': node.r,
                                    '--orbit-dur': node.dur,
                                    animationDelay: node.delay
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => handlePick(meta.id)}
                                    onMouseEnter={() => setHoveredLangId(meta.id)}
                                    onMouseLeave={() => setHoveredLangId(null)}
                                    className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-2xl border transition-all duration-300 outline-none cursor-pointer backdrop-blur-xl ${
                                        isSelected
                                            ? 'bg-accent/25 border-accent text-white shadow-[0_0_25px_rgba(var(--accent-rgb,212,188,148),0.4)] ring-2 ring-accent scale-110'
                                            : isHovered
                                                ? 'bg-white/15 border-white/40 text-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-120 -translate-y-1'
                                                : 'bg-black/45 hover:bg-black/70 border-white/10 hover:border-white/30 text-white/80 shadow-lg hover:scale-115'
                                    }`}
                                >
                                    {/* High-DPI Vector Flag with Glass Sheen */}
                                    <LanguageFlag 
                                        code={meta.id} 
                                        className="w-7 h-5 rounded-md shadow-md transition-transform duration-300 group-hover:scale-105" 
                                    />

                                    {/* Native Label */}
                                    <div className="flex flex-col text-left pr-1">
                                        <span className={`text-xs font-bold leading-tight tracking-tight ${
                                            isSelected ? 'text-accent font-black' : 'text-white'
                                        }`}>
                                            {meta.name}
                                        </span>
                                        <span className="text-[9.5px] text-white/50 leading-none">
                                            {meta.englishName}
                                        </span>
                                    </div>

                                    {/* Active Pulse Bead */}
                                    {isSelected && (
                                        <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
