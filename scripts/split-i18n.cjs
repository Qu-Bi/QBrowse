const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const DOMAINS_DIR = path.join(ROOT, 'src', 'i18n', 'domains');
const BUNDLES_DIR = path.join(ROOT, 'src', 'i18n', 'bundles');

const LANG_CODES = ['en', 'pl', 'fr', 'de', 'es', 'pt', 'zh', 'ja', 'ru', 'it', 'uk', 'ko'];

async function loadEsmDefault(filePath) {
    const mod = await import(pathToFileURL(filePath).href);
    return mod.default;
}

async function main() {
    fs.mkdirSync(BUNDLES_DIR, { recursive: true });

    const [chromeDomain, popoversDomain, toolsDomain, settingsDomain, storesDomain] = await Promise.all([
        loadEsmDefault(path.join(DOMAINS_DIR, 'chrome.js')),
        loadEsmDefault(path.join(DOMAINS_DIR, 'popovers.js')),
        loadEsmDefault(path.join(DOMAINS_DIR, 'tools.js')),
        loadEsmDefault(path.join(DOMAINS_DIR, 'settings.js')),
        loadEsmDefault(path.join(DOMAINS_DIR, 'stores.js')),
    ]);

    let totalBytes = 0;

    for (const code of LANG_CODES) {
        const baseLocale = await loadEsmDefault(path.join(LOCALES_DIR, `${code}.js`));
        const merged = {
            ...(baseLocale || {}),
            chrome: chromeDomain?.[code] || {},
            pop: popoversDomain?.[code] || {},
            tools: toolsDomain?.[code] || {},
            cfg: settingsDomain?.[code] || {},
            stores: storesDomain?.[code] || {},
        };

        const outPath = path.join(BUNDLES_DIR, `${code}.json`);
        const json = JSON.stringify(merged);
        fs.writeFileSync(outPath, json, 'utf8');
        totalBytes += Buffer.byteLength(json, 'utf8');

        // Verify 100% key-for-key and value-for-value equality
        const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        assert.deepStrictEqual(parsed, merged, `Lossless check failed for locale ${code}`);
        console.log(`[split-i18n] ${code}.json -> ${(Buffer.byteLength(json, 'utf8') / 1024).toFixed(1)} KB (verified lossless)`);
    }

    console.log(`[split-i18n] All ${LANG_CODES.length} locale bundles generated and verified (${(totalBytes / 1024).toFixed(1)} KB total).`);
}

main().catch((err) => {
    console.error('[split-i18n] Failed:', err);
    process.exit(1);
});
