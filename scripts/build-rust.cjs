const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RUST_DIR = path.join(ROOT, 'rust');
const NATIVE_DIR = path.join(ROOT, 'electron', 'native');

function getPlatformTargetFilename() {
  if (process.platform === 'win32') {
    return `qbrowse-core.win32-${process.arch}-msvc.node`;
  }
  if (process.platform === 'linux') {
    return `qbrowse-core.linux-${process.arch}-gnu.node`;
  }
  if (process.platform === 'darwin') {
    return `qbrowse-core.darwin-${process.arch}.node`;
  }
  throw new Error(`Unsupported platform: ${process.platform}-${process.arch}`);
}

function getCargoOutputPath(isRelease = true) {
  const profileDir = isRelease ? 'release' : 'debug';
  if (process.platform === 'win32') {
    return path.join(RUST_DIR, 'target', profileDir, 'qbrowse_napi.dll');
  }
  if (process.platform === 'darwin') {
    return path.join(RUST_DIR, 'target', profileDir, 'libqbrowse_napi.dylib');
  }
  return path.join(RUST_DIR, 'target', profileDir, 'libqbrowse_napi.so');
}

function main() {
  const args = process.argv.slice(2);
  const isDebug = args.includes('--debug');
  const cargoArgs = ['build', '--manifest-path', path.join(RUST_DIR, 'Cargo.toml')];
  if (!isDebug) {
    cargoArgs.push('--release');
  }

  console.log(`[build-rust] Running: cargo ${cargoArgs.join(' ')}`);
  const res = spawnSync('cargo', cargoArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (res.status !== 0) {
    process.exit(res.status || 1);
  }

  const src = getCargoOutputPath(!isDebug);
  if (!fs.existsSync(src)) {
    console.error(`[build-rust] Expected Rust cdylib not found at: ${src}`);
    process.exit(1);
  }

  fs.mkdirSync(NATIVE_DIR, { recursive: true });
  const dest = path.join(NATIVE_DIR, getPlatformTargetFilename());
  fs.copyFileSync(src, dest);
  console.log(`[build-rust] Copied ${src} -> ${dest}`);
}

main();
