const fs = require('fs');
const path = require('path');

function getBinaryFilename() {
  if (process.platform === 'win32') {
    return `qbrowse-core.win32-${process.arch}-msvc.node`;
  }
  if (process.platform === 'linux') {
    return `qbrowse-core.linux-${process.arch}-gnu.node`;
  }
  if (process.platform === 'darwin') {
    return `qbrowse-core.darwin-${process.arch}.node`;
  }
  return `qbrowse-core.${process.platform}-${process.arch}.node`;
}

function resolveNativeBinaryPath() {
  const filename = getBinaryFilename();
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'native', filename));
    candidates.push(path.join(process.resourcesPath, 'electron', 'native', filename));
  }
  candidates.push(path.join(__dirname, 'native', filename));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[candidates.length - 1];
}

let _addon = null;
let _loadError = null;

function getAddon() {
  if (_addon) return _addon;
  if (_loadError) throw _loadError;

  const binPath = resolveNativeBinaryPath();
  try {
    _addon = require(binPath);
    return _addon;
  } catch (err) {
    _loadError = new Error(`[rustBridge] Failed to load native QBrowse Rust core at ${binPath}: ${err.message}`);
    throw _loadError;
  }
}

function isAvailable() {
  try {
    return Boolean(getAddon());
  } catch {
    return false;
  }
}

function extDownloadAndUnpackCws(extId, chromeVersion, destRoot) {
  return getAddon().extDownloadAndUnpackCws(extId, chromeVersion, destRoot);
}

function extInspectUnpacked(dirPath) {
  return getAddon().extInspectUnpacked(dirPath);
}

module.exports = new Proxy(
  {
    getAddon,
    isAvailable,
    resolveNativeBinaryPath,
    extDownloadAndUnpackCws,
    extInspectUnpacked,
  },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      const addon = getAddon();
      return addon[prop];
    },
  }
);
