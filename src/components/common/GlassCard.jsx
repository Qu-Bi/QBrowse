import React from 'react';

export default function GlassCard({ children, className = '', isDark = true, blur = '3xl', rounded = '2xl', ...props }) {
    const baseClasses = isDark 
        ? `bg-[#121214]/80 backdrop-blur-${blur} border border-white/10 rounded-${rounded} shadow-2xl text-white`
        : `bg-white/85 backdrop-blur-${blur} border border-black/[0.08] rounded-${rounded} shadow-[0_20px_50px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.05)] text-zinc-900`;
        
    return (
        <div className={`${baseClasses} ${className}`} {...props}>
            {children}
        </div>
    );
}
