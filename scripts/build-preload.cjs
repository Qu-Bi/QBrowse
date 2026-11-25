const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = path.join(ROOT, 'electron', 'webview_preload.cjs');
const OUTFILE = path.join(ROOT, 'electron', 'webview_preload.min.cjs');

async function main() {
    if (!fs.existsSync(ENTRY)) {
        throw new Error(`Preload entry not found: ${ENTRY}`);
    }

    await esbuild.build({
        entryPoints: [ENTRY],
        outfile: OUTFILE,
        bundle: true,
        minify: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20', 'chrome120'],
        external: ['electron'],
        logLevel: 'info',
    });

    const inSize = fs.statSync(ENTRY).size;
    const outSize = fs.statSync(OUTFILE).size;
    console.log(
        `[build-preload] ${path.relative(ROOT, ENTRY)} (${(inSize / 1024).toFixed(1)} KB) -> ${path.relative(ROOT, OUTFILE)} (${(outSize / 1024).toFixed(1)} KB)`
    );
}

main().catch((err) => {
    console.error('[build-preload] Failed:', err);
    process.exit(1);
});
