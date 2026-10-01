import React, { useState, useEffect, useCallback } from 'react';
import useUIStore from '../../store/useUIStore';
import { playBootWelcomeChime } from '../../utils/bootAudio';
import qbrowseLogo from '../../assets/icon.png';

export default function BootCurtain({ onFinish }) {
    const isFirstBoot = useUIStore(state => state.isFirstBoot);
    const completeFirstBoot = useUIStore(state => state.completeFirstBoot);
    const playStartupSoundSetting = useUIStore(state => state.settings?.playStartupSound ?? false);

    const [isBlooming, setIsBlooming] = useState(false);
    const [isDone, setIsDone] = useState(false);

    const handleSkip = useCallback(() => {
        setIsDone(true);
        if (isFirstBoot) completeFirstBoot();
        if (onFinish) onFinish();
    }, [isFirstBoot, completeFirstBoot, onFinish]);

    useEffect(() => {
        if (isFirstBoot || playStartupSoundSetting) {
            playBootWelcomeChime();
        }

        // Daily boot: 700ms holding (gives custom wallpaper time to decode) + 300ms dissolve = 1000ms
        // First boot: 1500ms holding + 400ms dissolve = 1900ms (longer, majestic sequence)
        const holdDuration = isFirstBoot ? 1500 : 700;
        const totalDuration = isFirstBoot ? 1900 : 1000;

        const t1 = setTimeout(() => setIsBlooming(true), holdDuration);
        const t2 = setTimeout(() => {
            setIsDone(true);
            if (isFirstBoot) completeFirstBoot();
            if (onFinish) onFinish();
        }, totalDuration);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [isFirstBoot, playStartupSoundSetting, completeFirstBoot, onFinish]);

    // Allow user to click or hit any key to dismiss instantly
    useEffect(() => {
        const handleKeyDown = () => handleSkip();
        window.addEventListener('keydown', handleKeyDown, { once: true });
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSkip]);

    if (isDone) return null;

    return (
        <div 
            id="qbrowse-boot-curtain"
            onClick={handleSkip}
            className={`fixed inset-0 z-[999999] flex items-center justify-center bg-[#07080a] select-none cursor-default transition-opacity duration-300 ease-out ${
                isBlooming ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
            }`}
            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
        >
            {/* Ambient Radial Core Glow */}
            <div 
                className={`absolute w-[440px] h-[440px] rounded-full pointer-events-none transition-all duration-400 ease-out ${
                    isBlooming ? 'scale-130 opacity-0' : 'scale-100 opacity-80'
                }`}
                style={{
                    background: 'radial-gradient(circle, rgba(212,188,148,0.24) 0%, rgba(212,188,148,0.06) 45%, transparent 70%)',
                    transform: 'translateZ(0)',
                    willChange: 'opacity, transform'
                }}
            />

            {/* Glowing Golden Core Halo behind emblem (100% GPU texture, zero alpha convolution lag) */}
            <div 
                className={`absolute w-[140px] h-[140px] rounded-full pointer-events-none transition-all duration-300 ease-out ${
                    isBlooming ? 'scale-120 opacity-0' : 'scale-100 opacity-90'
                }`}
                style={{
                    background: 'radial-gradient(circle, rgba(212,188,148,0.5) 0%, rgba(212,188,148,0.12) 50%, transparent 72%)',
                    filter: 'blur(12px)',
                    transform: 'translateZ(0)',
                    willChange: 'opacity, transform'
                }}
            />

            {/* Minimalist Q Emblem - Pure Icon Only, Zero Lag, Zero Text */}
            <div 
                className={`relative w-[104px] h-[104px] flex items-center justify-center transition-transform duration-300 ease-out pointer-events-none ${
                    isBlooming ? 'scale-110' : 'scale-100'
                }`}
                style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            >
                <img 
                    src={qbrowseLogo} 
                    alt="QBrowse" 
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
}
