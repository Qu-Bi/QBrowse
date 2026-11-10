import React from 'react';
import { Languages, Globe, Check, Sparkles } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { 
    useTranslation, 
    SUPPORTED_LANGUAGES 
} from '../../i18n/index';
import LanguageFlag from '../common/LanguageFlag';
import ZeroGravityLanguageOrbit from '../common/ZeroGravityLanguageOrbit';

export default function LanguageSettings() {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const { 
        t, 
        currentLanguage, 
        resolvedLanguage, 
        isAuto, 
        setLanguage 
    } = useTranslation();

    const activeLangMeta = SUPPORTED_LANGUAGES.find(l => l.id === resolvedLanguage) || SUPPORTED_LANGUAGES[0];

    return (
        <div className="animate-tab-fade space-y-6 w-full pb-16">
            {/* Minimal Luxury Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 pr-12">
                <div>
                    <h3 className="text-2xl font-extrabold tracking-tight mb-1 flex items-center gap-3">
                        <span className="p-2 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm">
                            <Languages size={22} />
                        </span>
                        <span>{t('language.title', null, 'Language & Region')}</span>
                    </h3>
                    <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {t('language.subtitle', null, 'Select your preferred display language for the QBrowse interface and system dialogs.')}
                    </p>
                </div>
            </div>

            {/* Zero-Gravity Celestial Polyglot Centerpiece */}
            <ZeroGravityLanguageOrbit variant="embedded" />

            {/* 12-Language Quiet Luxury Grid */}
            <div className="w-full">
                <div className="mb-3.5 px-1">
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {t('language.selectLanguage', null, 'Select Display Language')} ({SUPPORTED_LANGUAGES.length})
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 w-full">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                        const isSelected = (!isAuto && currentLanguage === lang.id) || (isAuto && resolvedLanguage === lang.id);

                        return (
                            <button
                                key={lang.id}
                                type="button"
                                onClick={() => setLanguage(lang.id)}
                                className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between min-h-[120px] outline-none cursor-pointer ${
                                    isSelected
                                        ? (isBright 
                                            ? 'bg-accent/10 border-accent shadow-[0_4px_20px_var(--accent-20)] ring-1.5 ring-accent' 
                                            : 'bg-accent/10 border-accent shadow-[0_6px_25px_var(--accent-25)] ring-1.5 ring-accent -translate-y-0.5')
                                        : (isBright 
                                            ? 'bg-white/80 hover:bg-white border-black/[0.08] hover:border-black/20 hover:shadow-md hover:-translate-y-0.5' 
                                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/20 hover:shadow-lg hover:-translate-y-0.5')
                                }`}
                            >
                                {/* Top Row: Vector Flag + Active Checkmark */}
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className="flex items-center gap-2">
                                        <LanguageFlag code={lang.id} className="w-8 h-5.5 rounded-md shadow-sm" />
                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                            isSelected 
                                                ? 'bg-accent/25 text-accent' 
                                                : (isBright ? 'bg-black/5 text-zinc-500' : 'bg-white/10 text-white/50')
                                        }`}>
                                            {lang.id.toUpperCase()}
                                        </span>
                                    </div>

                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-accent text-zinc-950 flex items-center justify-center shadow-md animate-fade-in">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>

                                {/* Language Typography */}
                                <div className="flex-1 min-w-0">
                                    <h5 className={`text-base font-extrabold tracking-tight truncate ${
                                        isSelected 
                                            ? (isBright ? 'text-zinc-950 font-black' : 'text-accent font-black') 
                                            : (isBright ? 'text-zinc-900' : 'text-white')
                                    }`}>
                                        {lang.name}
                                    </h5>
                                    <p className={`text-[11px] truncate mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {lang.englishName} &bull; {lang.region}
                                    </p>
                                </div>

                                {/* Greeting Slogan Quote */}
                                <div className={`text-[10.5px] truncate mt-2 pt-2 border-t italic font-medium ${
                                    isSelected 
                                        ? 'border-accent/20 text-accent' 
                                        : (isBright ? 'border-black/5 text-zinc-400' : 'border-white/5 text-zinc-500')
                                }`}>
                                    &ldquo;{lang.greeting}&rdquo;
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
