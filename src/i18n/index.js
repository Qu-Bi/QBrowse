// QBrowse Modular Internationalization (i18n) Engine
import { useMemo } from 'react';
import useUIStore from '../store/useUIStore';
import { playLanguageSwitchChime } from '../utils/languageAudio';

import en from './locales/en.js';
import pl from './locales/pl.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import es from './locales/es.js';
import pt from './locales/pt.js';
import zh from './locales/zh.js';
import ja from './locales/ja.js';
import ru from './locales/ru.js';
import it from './locales/it.js';
import uk from './locales/uk.js';
import ko from './locales/ko.js';

export const DICTIONARIES = {
    en, pl, fr, de, es, pt, zh, ja, ru, it, uk, ko
};

export const SUPPORTED_LANGUAGES = [
    { id: 'en', name: 'English', englishName: 'English', flag: '🇬🇧', region: 'Universal / US & UK', greeting: 'Welcome to QBrowse!' },
    { id: 'pl', name: 'Polski', englishName: 'Polish', flag: '🇵🇱', region: 'Polska', greeting: 'Witaj w QBrowse!' },
    { id: 'fr', name: 'Français', englishName: 'French', flag: '🇫🇷', region: 'France & Canada', greeting: 'Bienvenue sur QBrowse !' },
    { id: 'de', name: 'Deutsch', englishName: 'German', flag: '🇩🇪', region: 'Deutschland & Österreich', greeting: 'Willkommen bei QBrowse!' },
    { id: 'es', name: 'Español', englishName: 'Spanish', flag: '🇪🇸', region: 'España & Latinoamérica', greeting: '¡Bienvenido a QBrowse!' },
    { id: 'pt', name: 'Português', englishName: 'Portuguese', flag: '🇵🇹', region: 'Brasil & Portugal', greeting: 'Bem-vindo ao QBrowse!' },
    { id: 'zh', name: '简体中文', englishName: 'Chinese (Simplified)', flag: '🇨🇳', region: '中国 (China)', greeting: '欢迎使用 QBrowse！' },
    { id: 'ja', name: '日本語', englishName: 'Japanese', flag: '🇯🇵', region: '日本 (Japan)', greeting: 'QBrowseへようこそ！' },
    { id: 'ru', name: 'Русский', englishName: 'Russian', flag: '🇷🇺', region: 'Россия & СНГ', greeting: 'Добро пожаловать в QBrowse!' },
    { id: 'it', name: 'Italiano', englishName: 'Italian', flag: '🇮🇹', region: 'Italia', greeting: 'Benvenuto su QBrowse!' },
    { id: 'uk', name: 'Українська', englishName: 'Ukrainian', flag: '🇺🇦', region: 'Україна', greeting: 'Ласкаво просимо до QBrowse!' },
    { id: 'ko', name: '한국어', englishName: 'Korean', flag: '🇰🇷', region: '대한민국 (Korea)', greeting: 'QBrowse에 오신 것을 환영합니다!' }
];

/**
 * Detects the host operating system's primary language.
 */
export function getSystemLanguage() {
    if (typeof navigator === 'undefined' || !navigator.language) return 'en';
    const navLang = navigator.language.toLowerCase().trim();
    
    // Exact or prefix match
    const primaryCode = navLang.split('-')[0];
    const found = SUPPORTED_LANGUAGES.find(l => l.id === primaryCode || l.id === navLang);
    return found ? found.id : 'en';
}

/**
 * Resolves effective active language code from store setting ('auto' or specific code).
 */
export function resolveActiveLanguage(settingValue) {
    if (!settingValue || settingValue === 'auto') {
        return getSystemLanguage();
    }
    const exists = SUPPORTED_LANGUAGES.some(l => l.id === settingValue);
    return exists ? settingValue : 'en';
}

/**
 * Traverses nested object with dot notation (e.g. 'settings.tabs.appearance').
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, obj);
}

/**
 * Translates a given key with parameter interpolation and recursive English fallback.
 */
export function t(path, params = {}, fallback = '') {
    try {
        const state = useUIStore?.getState?.();
        const rawSetting = state?.settings?.appLanguage || 'auto';
        const activeLang = resolveActiveLanguage(rawSetting);

        let value = getNestedValue(DICTIONARIES[activeLang], path);
        if (value === undefined && activeLang !== 'en') {
            value = getNestedValue(DICTIONARIES.en, path);
        }

        if (value === undefined) {
            return fallback || path;
        }

        if (typeof value !== 'string') {
            return value;
        }

        if (params && typeof params === 'object') {
            return Object.entries(params).reduce((str, [k, v]) => {
                return str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            }, value);
        }

        return value;
    } catch (_) {
        return fallback || path;
    }
}

/**
 * Fires the cinematic WOW translation warp event and harmonic chime.
 */
export function triggerLanguageWarp(targetLang) {
    if (typeof window === 'undefined') return;
    try {
        playLanguageSwitchChime();

        const langMeta = SUPPORTED_LANGUAGES.find(l => l.id === targetLang) || {
            name: targetLang,
            flag: '🌐',
            greeting: 'Welcome!'
        };

        window.dispatchEvent(new CustomEvent('qbrowse-language-warp', {
            detail: {
                lang: targetLang,
                meta: langMeta,
                timestamp: Date.now()
            }
        }));

        if (typeof document !== 'undefined') {
            document.documentElement.lang = targetLang;
        }
    } catch (_) {}
}

/**
 * React hook for components to subscribe to language changes.
 */
export function useTranslation() {
    const rawSetting = useUIStore(state => state.settings?.appLanguage) || 'auto';
    const isAuto = rawSetting === 'auto';
    const activeLanguage = useMemo(() => resolveActiveLanguage(rawSetting), [rawSetting]);

    const translate = useMemo(() => {
        return (path, params, fallback) => {
            let val = getNestedValue(DICTIONARIES[activeLanguage], path);
            if (val === undefined && activeLanguage !== 'en') {
                val = getNestedValue(DICTIONARIES.en, path);
            }
            if (val === undefined) return fallback || path;
            if (typeof val !== 'string') return val;
            if (params && typeof params === 'object') {
                return Object.entries(params).reduce((str, [k, v]) => {
                    return str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
                }, val);
            }
            return val;
        };
    }, [activeLanguage]);

    const setLanguage = (newCode) => {
        const store = useUIStore.getState();
        const resolved = resolveActiveLanguage(newCode);
        triggerLanguageWarp(resolved);
        store.setSettingValue('appLanguage', newCode);
    };

    return {
        t: translate,
        currentLanguage: rawSetting,
        resolvedLanguage: activeLanguage,
        isAuto,
        setLanguage,
        languages: SUPPORTED_LANGUAGES
    };
}

export default {
    t,
    useTranslation,
    SUPPORTED_LANGUAGES,
    getSystemLanguage,
    resolveActiveLanguage,
    triggerLanguageWarp
};

