// Shared Liquid Glass surface styling for context menus, popovers, modals & submenus

export const getLiquidGlassSurfaceClasses = (isBright) =>
    `liquid-glass-surface border transition-colors ${
        isBright
            ? 'border-black/[0.08] text-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.14),inset_0_1px_1px_rgba(255,255,255,0.85)]'
            : 'border-white/[0.10] text-white/95 shadow-[0_25px_70px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.16)]'
    }`;

export const getLiquidGlassMenuClasses = (isBright) =>
    `p-1.5 rounded-2xl select-none outline-none ${getLiquidGlassSurfaceClasses(isBright)}`;

export const getLiquidGlassCardClasses = (isBright) =>
    isBright
        ? 'bg-black/[0.035] border border-black/[0.06]'
        : 'bg-black/25 border border-white/[0.08]';

export const getLiquidGlassInlineStyle = (isBright) => ({
    backgroundColor: isBright ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 20, 32, 0.58)',
    backdropFilter: isBright
        ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
        : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)',
    WebkitBackdropFilter: isBright
        ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
        : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)'
});

export const getLiquidGlassStyle = (isBright, opacityDark = 0.40, opacityLight = 0.70) => ({
    background: isBright ? `rgba(255, 255, 255, ${opacityLight})` : `rgba(14, 15, 22, ${opacityDark})`,
    backdropFilter: 'blur(28px) saturate(160%)',
    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
    border: isBright ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: isBright
        ? '0 24px 64px -16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        : '0 28px 72px -16px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
});
