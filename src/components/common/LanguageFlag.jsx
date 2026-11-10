import React from 'react';

/**
 * High-definition vector flags for all supported QBrowse languages.
 * Eliminates Windows emoji font degradation (which renders flags as raw 'GB', 'PL' letters).
 */
export default function LanguageFlag({ code, className = 'w-6 h-4', shadow = true }) {
    const norm = (code || '').toLowerCase().trim();

    const flagWrapper = (svgContent) => (
        <span
            className={`inline-flex items-center justify-center overflow-hidden rounded-[3px] flex-shrink-0 select-none ${shadow ? 'shadow-[0_1px_3px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.12)]' : ''
                } ${className}`}
            style={{ aspectRatio: '3 / 2' }}
        >
            <svg
                viewBox="0 0 60 40"
                className="w-full h-full object-cover block"
                xmlns="http://www.w3.org/2000/svg"
            >
                {svgContent}
            </svg>
        </span>
    );

    switch (norm) {
        // 1. UK / English
        case 'en':
        case 'gb':
        case 'uk-en':
            return flagWrapper(
                <g>
                    {/* Blue field */}
                    <rect width="60" height="40" fill="#012169" />
                    {/* White St Andrew's saltire */}
                    <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
                    {/* Red St Patrick's saltire */}
                    <path d="M0,0 L60,40" stroke="#C8102E" strokeWidth="3" />
                    <path d="M60,0 L0,40" stroke="#C8102E" strokeWidth="3" />
                    {/* White St George's cross */}
                    <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="12" />
                    {/* Red St George's cross */}
                    <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
                </g>
            );

        // 2. Poland
        case 'pl':
            return flagWrapper(
                <g>
                    <rect width="60" height="20" fill="#FFFFFF" />
                    <rect y="20" width="60" height="20" fill="#DC143C" />
                </g>
            );

        // 3. France
        case 'fr':
            return flagWrapper(
                <g>
                    <rect width="20" height="40" fill="#002654" />
                    <rect x="20" width="20" height="40" fill="#FFFFFF" />
                    <rect x="40" width="20" height="40" fill="#ED2939" />
                </g>
            );

        // 4. Germany
        case 'de':
            return flagWrapper(
                <g>
                    <rect width="60" height="13.33" fill="#000000" />
                    <rect y="13.33" width="60" height="13.33" fill="#DD0000" />
                    <rect y="26.66" width="60" height="13.34" fill="#FFCE00" />
                </g>
            );

        // 5. Spain
        case 'es':
            return flagWrapper(
                <g>
                    <rect width="60" height="10" fill="#AA151B" />
                    <rect y="10" width="60" height="20" fill="#F1BF00" />
                    <rect y="30" width="60" height="10" fill="#AA151B" />
                    {/* Stylized Spanish Coat of Arms */}
                    <circle cx="18" cy="20" r="5" fill="#AA151B" />
                    <circle cx="18" cy="20" r="3.2" fill="#F1BF00" />
                    <rect x="16.5" y="16.5" width="3" height="7" fill="#AA151B" />
                </g>
            );

        // 6. Portugal
        case 'pt':
            return flagWrapper(
                <g>
                    <rect width="24" height="40" fill="#006600" />
                    <rect x="24" width="36" height="40" fill="#FF0000" />
                    {/* Armillary sphere & shield */}
                    <circle cx="24" cy="20" r="8" fill="#FFCC00" stroke="#000000" strokeWidth="0.8" />
                    <rect x="20" y="15" width="8" height="10" rx="2" fill="#FFFFFF" stroke="#000000" strokeWidth="0.8" />
                    <path d="M22,17 H26 V23 H22 Z" fill="#002654" />
                </g>
            );

        // 7. China
        case 'zh':
        case 'cn':
            return flagWrapper(
                <g>
                    <rect width="60" height="40" fill="#DE2910" />
                    {/* Large central star */}
                    <polygon points="12,7 13.8,12.5 19.5,12.5 15,16 16.8,21.5 12,18 7.2,21.5 9,16 4.5,12.5 10.2,12.5" fill="#FFDE00" />
                    {/* Arc stars */}
                    <polygon points="23,4 23.6,6 25.5,6 24,7.2 24.6,9.2 23,8 21.4,9.2 22,7.2 20.5,6 22.4,6" fill="#FFDE00" />
                    <polygon points="27,9 27.6,11 29.5,11 28,12.2 28.6,14.2 27,13 25.4,14.2 26,12.2 24.5,11 26.4,11" fill="#FFDE00" />
                    <polygon points="27,16 27.6,18 29.5,18 28,19.2 28.6,21.2 27,20 25.4,21.2 26,19.2 24.5,18 26.4,18" fill="#FFDE00" />
                    <polygon points="23,22 23.6,24 25.5,24 24,25.2 24.6,27.2 23,26 21.4,27.2 22,25.2 20.5,24 22.4,24" fill="#FFDE00" />
                </g>
            );

        // 8. Japan
        case 'ja':
        case 'jp':
            return flagWrapper(
                <g>
                    <rect width="60" height="40" fill="#FFFFFF" />
                    <circle cx="30" cy="20" r="11" fill="#BC002D" />
                </g>
            );

        // 9. Russia
        case 'ru':
            return flagWrapper(
                <g>
                    <rect width="60" height="13.33" fill="#FFFFFF" />
                    <rect y="13.33" width="60" height="13.33" fill="#0039A6" />
                    <rect y="26.66" width="60" height="13.34" fill="#D52B1E" />
                </g>
            );

        // 10. Italy
        case 'it':
            return flagWrapper(
                <g>
                    <rect width="20" height="40" fill="#009246" />
                    <rect x="20" width="20" height="40" fill="#FFFFFF" />
                    <rect x="40" width="20" height="40" fill="#CE2B37" />
                </g>
            );

        // 11. Ukraine
        case 'uk':
        case 'ua':
            return flagWrapper(
                <g>
                    <rect width="60" height="20" fill="#0057B7" />
                    <rect y="20" width="60" height="20" fill="#FFD700" />
                </g>
            );

        // 12. South Korea
        case 'ko':
        case 'kr':
            return flagWrapper(
                <g>
                    <rect width="60" height="40" fill="#FFFFFF" />
                    {/* Taegeuk circle */}
                    <g transform="translate(30,20) rotate(-34)">
                        <path d="M-9,0 A9,9 0 0,1 9,0 A4.5,4.5 0 0,1 0,0 A4.5,4.5 0 0,0 -9,0" fill="#CD2E3A" />
                        <path d="M9,0 A9,9 0 0,1 -9,0 A4.5,4.5 0 0,1 0,0 A4.5,4.5 0 0,0 9,0" fill="#0047A0" />
                    </g>
                    {/* Minimalist Trigrams */}
                    <rect x="10" y="8" width="4" height="1" fill="#000000" transform="rotate(-34 12 8)" />
                    <rect x="10" y="10" width="4" height="1" fill="#000000" transform="rotate(-34 12 10)" />
                    <rect x="46" y="28" width="4" height="1" fill="#000000" transform="rotate(-34 48 28)" />
                    <rect x="46" y="30" width="4" height="1" fill="#000000" transform="rotate(-34 48 30)" />
                </g>
            );

        default:
            return flagWrapper(
                <g>
                    <rect width="60" height="40" fill="#2A3042" />
                    <circle cx="30" cy="20" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                    <ellipse cx="30" cy="20" rx="5" ry="10" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                    <line x1="20" y1="20" x2="40" y2="20" stroke="#FFFFFF" strokeWidth="1.5" />
                </g>
            );
    }
}

