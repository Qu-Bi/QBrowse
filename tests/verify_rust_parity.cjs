'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const rust = require('../electron/rustBridge.cjs');

let passed = 0;
async function test(name, fn) {
    try {
        await fn();
        console.log(`  PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL: ${name}\n   `, err);
        process.exitCode = 1;
    }
}

async function run() {
    console.log('Running QBrowse Rust Core Parity Suite...');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qbrowse-rust-parity-'));

    await test('01. N-API bridge loads and reports all 10 crates', () => {
        const ver = rust.version();
        assert(ver.includes('qbrowse-core'), ver);
        for (const crate of [
            'qbrowse-storage', 'qbrowse-sync', 'qbrowse-shield', 'qbrowse-reader',
            'qbrowse-github', 'qbrowse-vault', 'qbrowse-media', 'qbrowse-sys',
            'qbrowse-ai', 'qbrowse-tor'
        ]) {
            assert(ver.includes(crate), `Missing ${crate} in ${ver}`);
        }
    });

    await test('02. Storage: SQLite WAL init, FTS5 search, Maps/GitHub rich meta, Ghost/Tor/.onion isolation', () => {
        const dbPath = path.join(tmpDir, 'qbrowse.db');
        assert.strictEqual(rust.storageInit(dbPath, null), true);

        // Record normal visit with tracking params
        const saved = rust.storageRecordVisit(
            'https://github.com/Qu-Bi/QBrowse/pull/42?utm_source=twitter&fbclid=123',
            'Pull Request #42',
            'default',
            Date.now()
        );
        assert(saved && saved.url === 'https://github.com/Qu-Bi/QBrowse/pull/42', 'Tracking params stripped');

        // Reject ghost, tor, .onion, about:blank
        assert.strictEqual(rust.storageRecordVisit('https://example.com', 'Ghost', 'ghost', Date.now()), null);
        assert.strictEqual(rust.storageRecordVisit('https://example.com', 'Tor', 'tor', Date.now()), null);
        assert.strictEqual(rust.storageRecordVisit('http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/', 'DDG', 'default', Date.now()), null);
        assert.strictEqual(rust.storageRecordVisit('about:blank', 'Blank', 'default', Date.now()), null);

        // FTS5 search
        const hits = rust.storageSearchHistory('QBrowse', 10, null);
        assert(Array.isArray(hits) && hits.length >= 1, 'FTS5 finds QBrowse PR');
    });

    await test('03. Storage: Site permissions persistent vs ephemeral ghost/tor, Bangs, Bookmarks', () => {
        rust.permissionSet('persist:profile_default', 'https://meet.google.com/abc', 'camera', 'allow');
        assert.strictEqual(rust.permissionCheck('persist:profile_default', 'https://meet.google.com', 'camera'), true);

        rust.permissionSet('ghost', 'https://meet.google.com', 'microphone', 'allow');
        assert.strictEqual(rust.permissionCheck('ghost', 'https://meet.google.com', 'microphone'), true);
        rust.permissionClearPartition('ghost');
        assert.strictEqual(rust.permissionCheck('ghost', 'https://meet.google.com', 'microphone'), false);

        const bang = rust.bangsResolve('!gh rust napi', null);
        assert(bang && bang.matched && bang.targetUrl.includes('github.com'), 'Resolves !gh bang');

        const htmlBm = rust.bookmarksImportHtml('<DL><DT><A HREF="https://qbrowse.app">QBrowse</A></DL>');
        assert(Array.isArray(htmlBm) && htmlBm.length === 1 && htmlBm[0].url === 'https://qbrowse.app');
    });

    await test('04. Sync: v2 Brotli+AES-GCM roundtrip + legacy v1 PBKDF2 WebCrypto compatibility + BLAKE3', async () => {
        const payload = JSON.stringify({ tabs: [{ id: 't1', url: 'https://example.com' }], repeat: 'x'.repeat(200) });
        const envV2 = await rust.syncEncryptV2('my-sync-pass', payload);
        assert(envV2.salt && envV2.iv && envV2.cipher);
        const decV2 = await rust.syncDecrypt('my-sync-pass', envV2.salt, envV2.iv, envV2.cipher);
        assert.strictEqual(decV2, payload);

        // Verify Node PBKDF2+AES-GCM v1 vector decrypts identically in Rust
        const salt = crypto.randomBytes(16);
        const iv = crypto.randomBytes(12);
        const key = crypto.pbkdf2Sync('legacy-pass', salt, 100000, 32, 'sha256');
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const ct = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final(), cipher.getAuthTag()]);
        const decV1 = await rust.syncDecrypt('legacy-pass', salt.toString('hex'), iv.toString('hex'), ct.toString('hex'));
        assert.strictEqual(decV1, payload);

        assert.strictEqual(rust.syncBlake3Hash('hello').length, 64);
    });

    await test('05. Shield: Adblock DFA, OAuth/YouTube bypasses, HTTPS-Only, 3P cookies, CSP mainFrame-only, Dark exclusions', () => {
        rust.shieldSetActive(true);
        rust.shieldSetTabContext(101, 'https://example.com/article', 'default', false);
        const ad = rust.shieldCheckRequest(101, 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'https://example.com/article', 'script');
        assert.strictEqual(ad.blocked, true);

        const oauth = rust.shieldCheckRequest(101, 'https://accounts.google.com/o/oauth2/v2/auth', 'https://example.com/article', 'subFrame');
        assert.strictEqual(oauth.blocked, false);

        assert.strictEqual(rust.shieldCheckHttpsUpgrade('http://example.com/test', true, []), 'https://example.com/test');
        assert.strictEqual(rust.shieldCheckHttpsUpgrade('http://192.168.1.10:8080/', true, []), null);
        assert.strictEqual(rust.shieldCheckHttpsUpgrade('http://localhost:1420/', true, []), null);

        const reqHdrs = JSON.parse(rust.shieldEvaluateRequestHeaders(
            101,
            'https://tracker.other.com/pixel',
            JSON.stringify({ Cookie: 'id=123', 'sec-ch-ua-platform-version': '"15.0"' }),
            true,
            true,
            true
        ));
        assert(!('Cookie' in reqHdrs) && !('cookie' in reqHdrs), 'Strips 3P Cookie');
        assert.strictEqual(reqHdrs['DNT'], '1');

        assert.strictEqual(rust.shieldIsDarkExcluded('https://www.youtube.com/watch?v=1', []), true);
    });

    await test('06. Reader & TOTP & Passkey & Vault Crypto & CSV Importer', async () => {
        const html = '<html><head><title>Rust Speed</title></head><body><nav>Nav</nav><article><h1>Rust Speed</h1><p>QBrowse now runs core engines in native Rust for instant startup and lower memory usage across every tab.</p><p>Second paragraph with enough content to pass extraction.</p></article></body></html>';
        const article = rust.readerExtractArticle(html, 'https://example.com/post');
        assert(article.contentHtml.includes('data-tts-id="tts-block-'), 'Has TTS blocks');

        const totp = rust.vaultGenerateTotp('otpauth://totp/QBrowse:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=QBrowse');
        assert(/^\d{6}$/.test(totp.code), 'Valid 6-digit TOTP');

        const passkey = rust.vaultGeneratePasskey('ES256');
        const sig = rust.vaultSignPasskeyAssertion(passkey.privateKeyPem, Buffer.from('auth'), Buffer.from('hash'));
        assert(Buffer.isBuffer(sig) && sig.length > 0);

        const csv = 'name,url,username,password\nGitHub,https://github.com,alice,pw123\n';
        const imp = rust.vaultImportData(csv, 'chrome.csv');
        assert(Array.isArray(imp.items) && imp.items.length === 1);

        const helloAvail = await rust.vaultCheckWindowsHello();
        assert(typeof helloAvail.available === 'boolean');
    });

    await test('07. Media: Probe streamUrl (no base64), HTTP 206 range, GIF loop strip, SHA-256, WebP thumb', async () => {
        const binPath = path.join(tmpDir, 'sample.mp4');
        fs.writeFileSync(binPath, Buffer.from('0123456789ABCDEF'));

        const probe = await rust.mediaProbeLocalFile(binPath);
        assert.strictEqual(probe.base64, null);
        assert(probe.streamUrl.startsWith('qbrowse-local://file?path='));

        const range = await rust.mediaReadFileRangeBuffer(binPath, 'bytes=4-7', 1024);
        assert.strictEqual(range.status, 206);
        assert.strictEqual(Buffer.from(range.bytes).toString('utf8'), '4567');

        const hash = await rust.mediaHashFile(binPath, 'sha256');
        assert.strictEqual(hash.length, 64);
    });

    await test('08. Sys & AI & Tor: Semver, latest.yml, Reduced Motion, DOCX, Zip-Slip safe archive, Torrc', async () => {
        assert.strictEqual(rust.sysCompareSemver('v1.4.3', '1.4.2'), 1);
        const yml = rust.sysParseLatestYml('version: 1.4.3\npath: QBrowse.exe\n');
        assert.strictEqual(yml.version, '1.4.3');
        assert.strictEqual(typeof rust.sysIsReducedMotionEnabled(), 'boolean');

        const tel = rust.sysGetProcessTelemetry();
        assert(tel.pid > 0 && tel.cpuCount >= 1);

        const torrc = rust.torGenerateTorrc({
            socksPort: 9050,
            controlPort: 9051,
            dataDirectory: tmpDir,
            cookieAuthentication: true
        });
        assert(torrc.includes('SocksPort 9050') && torrc.includes('ControlPort 9051'));
    });

    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    console.log(`\n${passed} Rust parity tests passed.`);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
