import React from 'react';

export default function GlassCard({ children, className = '', isDark = true, blur = '3xl', rounded = '2xl', ...props }) {
    const baseClasses = isDark 
        ? `bg-[#121214]/80 backdrop-blur-${blur} border border-white/10 rounded-${rounded} shadow-2xl`
        : `bg-white/80 backdrop-blur-${blur} border border-gray-200 rounded-${rounded} shadow-xl`;
        
    return (
        <div className={`${baseClasses} ${className}`} {...props}>
            {children}
        </div>
    );
}
