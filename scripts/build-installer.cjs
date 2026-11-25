const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const RUST_MANIFEST_PATH = path.join(ROOT, 'rust', 'Cargo.toml');
const RELEASE_BIN_PATH = path.join(ROOT, 'rust', 'target', 'release', 'qbrowse-installer.exe');
const DIST_DIR = path.join(ROOT, 'dist_electron');

function main() {
  if (process.platform !== 'win32') {
    console.error('[build-installer] qbrowse-installer.exe can only be built on Windows.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const version = pkg.version;
  if (!version) {
    console.error('[build-installer] Missing "version" in package.json.');
    process.exit(1);
  }

  const cargoArgs = [
    'build',
    '--manifest-path',
    RUST_MANIFEST_PATH,
    '--release',
    '-p',
    'qbrowse-installer',
  ];

  console.log(`[build-installer] Running: cargo ${cargoArgs.join(' ')}`);
  const res = spawnSync('cargo', cargoArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (res.status !== 0) {
    process.exit(res.status || 1);
  }

  if (!fs.existsSync(RELEASE_BIN_PATH)) {
    console.error(`[build-installer] Expected binary not found at: ${RELEASE_BIN_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });
  const destPath = path.join(DIST_DIR, `QBrowse-Web-Setup-${version}.exe`);
  fs.copyFileSync(RELEASE_BIN_PATH, destPath);

  const sizeBytes = fs.statSync(destPath).size;
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
  console.log(`[build-installer] Built ${destPath} (${sizeMb} MB)`);
}

main();
