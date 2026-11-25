// Lightweight i18n helpers extracted to avoid bundling full locale dictionaries into core chunks.

export function selectPluralForm(count, lang, one, few, many) {
    if (lang === 'pl' || lang === 'ru' || lang === 'uk') {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (count === 1) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }
    if (lang === 'fr' || lang === 'pt') {
        return (count === 0 || count === 1) ? one : many;
    }
    return count === 1 ? one : many;
}

export function formatTabCount(count, lang, tFn) {
    const key = selectPluralForm(count, lang, 'chrome.tabCountOne', 'chrome.tabCountFew', 'chrome.tabCountMany');
    const fallback = count === 1 ? `${count} tab` : `${count} tabs`;
    return tFn(key, { count }, fallback);
}

export const PLACEHOLDER_TAB_TITLE_SET = new Set([
    'new tab',
    'new incognito tab',
    'new tor tab',
    'nowa karta',
    'nowa karta incognito',
    'nowa karta tor',
    'nouvel onglet',
    'nouvel onglet privé',
    'nouvel onglet tor',
    'neuer tab',
    'neuer inkognito-tab',
    'neuer tor-tab',
    'nueva pestaña',
    'nueva pestaña de incógnito',
    'nueva pestaña tor',
    'nova guia',
    'nova guia anônima',
    'nova guia tor',
    '新标签页',
    '新无痕标签页',
    '新 tor 标签页',
    '新しいタブ',
    '新しいシークレットタブ',
    '新しい tor タブ',
    'новая вкладка',
    'новая вкладка инкогнито',
    'новая вкладка tor',
    'nuova scheda',
    'nuova scheda in incognito',
    'nuova scheda tor',
    'нова вкладка',
    'нова вкладка інкогніто',
    'нова вкладка tor',
    '새 탭',
    '새 시크릿 탭',
    '새 tor 탭'
]);
