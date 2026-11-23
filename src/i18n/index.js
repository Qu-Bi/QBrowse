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

import chromeDomain from './domains/chrome.js';
import popoversDomain from './domains/popovers.js';
import toolsDomain from './domains/tools.js';
import settingsDomain from './domains/settings.js';
import storesDomain from './domains/stores.js';

const BASE_LOCALES = {
    en, pl, fr, de, es, pt, zh, ja, ru, it, uk, ko
};

const LANG_CODES = Object.keys(BASE_LOCALES);

export const DICTIONARIES = LANG_CODES.reduce((acc, code) => {
    acc[code] = {
        ...(BASE_LOCALES[code] || {}),
        chrome: chromeDomain?.[code] || {},
        pop: popoversDomain?.[code] || {},
        tools: toolsDomain?.[code] || {},
        cfg: settingsDomain?.[code] || {},
        stores: storesDomain?.[code] || {}
    };
    return acc;
}, {});

export const INTL_LOCALE_MAP = {
    en: 'en-US',
    pl: 'pl-PL',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES',
    pt: 'pt-BR',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ru: 'ru-RU',
    it: 'it-IT',
    uk: 'uk-UA',
    ko: 'ko-KR'
};

export function getIntlLocale(lang) {
    const resolved = lang && INTL_LOCALE_MAP[lang] ? lang : resolveActiveLanguage(lang);
    return INTL_LOCALE_MAP[resolved] || 'en-US';
}

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

function formatTranslatedValue(path, params, fallback, activeLang) {
    let resolvedParams = params;
    let resolvedFallback = fallback;
    if (typeof resolvedParams === 'string' && resolvedFallback === undefined) {
        resolvedFallback = resolvedParams;
        resolvedParams = null;
    }

    let value = getNestedValue(DICTIONARIES[activeLang], path);
    if ((value === undefined || value === '') && activeLang !== 'en') {
        value = getNestedValue(DICTIONARIES.en, path);
    }

    if (value === undefined || value === '') {
        return resolvedFallback || path;
    }

    if (typeof value !== 'string') {
        return value;
    }

    if (resolvedParams && typeof resolvedParams === 'object') {
        return Object.entries(resolvedParams).reduce((str, [k, v]) => {
            return str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }, value);
    }

    return value;
}

/**
 * Translates a given key with parameter interpolation and recursive English fallback.
 */
export function t(path, params, fallback) {
    try {
        const state = useUIStore?.getState?.();
        const rawSetting = state?.settings?.appLanguage || 'auto';
        const activeLang = resolveActiveLanguage(rawSetting);
        return formatTranslatedValue(path, params, fallback, activeLang);
    } catch (_) {
        if (typeof params === 'string' && fallback === undefined) {
            return params || path;
        }
        return fallback || path;
    }
}

if (typeof window !== 'undefined') {
    window.__qbrowseT = t;
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
    const intlLocale = useMemo(() => getIntlLocale(activeLanguage), [activeLanguage]);

    const translate = useMemo(() => {
        return (path, params, fallback) => formatTranslatedValue(path, params, fallback, activeLanguage);
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
        intlLocale,
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
    getIntlLocale,
    triggerLanguageWarp
};

