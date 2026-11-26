const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const crypto = require('crypto');
const { ipcMain, session, Notification, webContents } = require('electron');

const CWS_ID_RE = /^[a-p]{32}$/;

class ExtensionEngine {
  constructor() {
    this.app = null;
    this.rustBridge = null;
    this.helpers = null;
    this.initialized = false;
    this.ipcRegistered = false;

    this.registryPath = '';
    this.registry = {}; // { [profileId]: { [extId]: entry } }

    this.configuredPartitions = new Set();
    this.runtimeIdToEntry = new Map(); // runtimeId -> { profileId, extId }
    this.extKeyToRuntimeId = new Map(); // `${profileId}:${extId}` -> runtimeId

    this.tabsByWindow = new Map(); // windowId -> tab[]
    this.lastFocusedWindowId = null;

    this.actionStates = new Map(); // `${profileId}:${extId}` -> actionState
    this.contextMenus = new Map(); // `${profileId}:${extId}` -> Map<menuItemId, item>
    this.stagedPaths = new Map(); // extId -> { resolvedDir, stagingParent }
  }

  isPathInsideDir(parentDir, childPath) {
    if (!parentDir || !childPath) return false;
    const resolveReal = (p) => {
      const abs = path.resolve(String(p));
      try {
        return typeof fsSync.realpathSync.native === 'function'
          ? fsSync.realpathSync.native(abs)
          : fsSync.realpathSync(abs);
      } catch {
        return abs;
      }
    };
    let normParent = resolveReal(parentDir);
    let normChild = resolveReal(childPath);
    if (process.platform === 'win32') {
      normParent = normParent.toLowerCase();
      normChild = normChild.toLowerCase();
    }
    const rel = path.relative(normParent, normChild);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  }

  normalizeProfileId(profileId) {
    const raw = typeof profileId === 'string' ? profileId.trim() : '';
    if (!raw) return 'default';
    if (raw === 'ghost' || raw === 'tor' || raw === 'defaultSession') {
      throw new Error(`Extensions are strictly forbidden in ${raw} session.`);
    }
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_') || 'default';
  }

  extKey(profileId, extId) {
    return `${this.normalizeProfileId(profileId)}:${String(extId)}`;
  }

  getProfilePartition(profileId) {
    return `persist:profile_${this.normalizeProfileId(profileId)}`;
  }

  getProfileSession(profileId) {
    const partition = this.getProfilePartition(profileId);
    const ses = session.fromPartition(partition);
    this.ensureSessionPreloads(ses, partition);
    return ses;
  }

  ensureSessionPreloads(ses, partition) {
    if (!ses || this.configuredPartitions.has(partition)) return;
    this.configuredPartitions.add(partition);

    const swPreloadPath = path.join(__dirname, 'extension_sw_preload.cjs');
    const framePreloadPath = path.join(__dirname, 'extension_page_preload.cjs');

    try {
      if (typeof ses.registerPreloadScript === 'function') {
        const existing = typeof ses.getPreloadScripts === 'function' ? ses.getPreloadScripts() : [];
        const existingIds = new Set((existing || []).map((s) => s && s.id));
        if (!existingIds.has('qbrowse-ext-sw')) {
          ses.registerPreloadScript({
            id: 'qbrowse-ext-sw',
            type: 'service-worker',
            filePath: swPreloadPath
          });
        }
        if (!existingIds.has('qbrowse-ext-frame')) {
          ses.registerPreloadScript({
            id: 'qbrowse-ext-frame',
            type: 'frame',
            filePath: framePreloadPath
          });
        }
      }
    } catch (err) {
      console.warn(`[ExtensionEngine] registerPreloadScript warning for ${partition}:`, err.message);
    }

    try {
      if (ses.protocol && typeof ses.protocol.handle === 'function') {
        const alreadyHandled = typeof ses.protocol.isProtocolHandled === 'function'
          ? ses.protocol.isProtocolHandled('qbrowse-ext-rpc')
          : false;
        if (!alreadyHandled) {
          ses.protocol.handle('qbrowse-ext-rpc', async (request) => {
            const originHeader = request.headers.get('origin') || request.headers.get('referer') || '';
            const explicitExtId = request.headers.get('x-qbrowse-ext-id') || '';

            // Reject non-extension web origins (http://, https://, file://, etc.)
            if (originHeader && !originHeader.startsWith('chrome-extension://')) {
              return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
                status: 403,
                headers: { 'content-type': 'application/json' }
              });
            }

            let runtimeId = null;
            if (originHeader.startsWith('chrome-extension://')) {
              try {
                const parsed = new URL(originHeader);
                if (parsed.protocol === 'chrome-extension:' && parsed.hostname) {
                  runtimeId = parsed.hostname;
                }
              } catch (_) {}
            } else if (/^[a-p]{32}$/.test(explicitExtId)) {
              runtimeId = explicitExtId;
            }

            let isKnownExt = Boolean(runtimeId && this.runtimeIdToEntry.has(runtimeId));
            if (!isKnownExt && runtimeId) {
              try {
                const loaded = ses.extensions && typeof ses.extensions.getAllExtensions === 'function'
                  ? ses.extensions.getAllExtensions()
                  : [];
                isKnownExt = Array.isArray(loaded) && loaded.some((e) => e && e.id === runtimeId);
              } catch (_) {}
            }

            if (!runtimeId || !isKnownExt) {
              return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
                status: 403,
                headers: { 'content-type': 'application/json' }
              });
            }

            const corsHeaders = {
              'access-control-allow-origin': originHeader.startsWith('chrome-extension://')
                ? `chrome-extension://${runtimeId}`
                : '*',
              'access-control-allow-methods': 'POST, OPTIONS',
              'access-control-allow-headers': 'content-type, x-qbrowse-ext-id',
              'content-type': 'application/json'
            };

            if (request.method === 'OPTIONS') {
              return new Response(null, { status: 204, headers: corsHeaders });
            }

            try {
              const bodyText = await request.text();
              const parsed = bodyText ? JSON.parse(bodyText) : {};
              const method = String(parsed?.method || '');
              const args = Array.isArray(parsed?.args) ? parsed.args : [];
              const result = await this.handleExtensionApiCall(runtimeId, method, args);
              return new Response(JSON.stringify({ ok: true, result: result === undefined ? null : result }), {
                status: 200,
                headers: corsHeaders
              });
            } catch (err) {
              return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), {
                status: 500,
                headers: corsHeaders
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn(`[ExtensionEngine] qbrowse-ext-rpc protocol handle warning for ${partition}:`, err.message);
    }
  }

  async init(app, rustBridge, helpers = {}) {
    this.app = app;
    this.rustBridge = rustBridge;
    this.helpers = helpers;

    const extensionsRoot = path.join(app.getPath('userData'), 'extensions');
    await fs.mkdir(extensionsRoot, { recursive: true });
    this.registryPath = path.join(extensionsRoot, 'registry.json');

    await this.loadRegistry();
    this.registerExtensionApiIpc();
    await this.initProfileExtensions('default');
    this.initialized = true;
  }

  async loadRegistry() {
    try {
      if (fsSync.existsSync(this.registryPath)) {
        const raw = await fs.readFile(this.registryPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          this.registry = parsed;
          return;
        }
      }
    } catch (err) {
      console.warn('[ExtensionEngine] Failed to load registry.json:', err.message);
    }
    this.registry = { default: {} };
  }

  async saveRegistry() {
    if (!this.registryPath) return;
    const dir = path.dirname(this.registryPath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = `${this.registryPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(this.registry, null, 2), 'utf8');
    await fs.rename(tmpPath, this.registryPath);
  }

  getProfileRegistry(profileId) {
    const pid = this.normalizeProfileId(profileId);
    if (!this.registry[pid] || typeof this.registry[pid] !== 'object') {
      this.registry[pid] = {};
    }
    return this.registry[pid];
  }

  broadcastToShells(channel, payload) {
    try {
      const wins = typeof this.helpers?.getBrowserWindows === 'function'
        ? Array.from(this.helpers.getBrowserWindows() || [])
        : [];
      for (const win of wins) {
        if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
          win.webContents.send(channel, payload);
        }
      }
    } catch (err) {
      console.warn(`[ExtensionEngine] Broadcast ${channel} failed:`, err.message);
    }
  }

  getActiveShellWindow() {
    try {
      const wins = typeof this.helpers?.getBrowserWindows === 'function'
        ? Array.from(this.helpers.getBrowserWindows() || [])
        : [];
      const focused = wins.find((w) => w && !w.isDestroyed() && w.isFocused());
      if (focused) return focused;
      const mainWin = typeof this.helpers?.getMainWindow === 'function' ? this.helpers.getMainWindow() : null;
      if (mainWin && !mainWin.isDestroyed()) return mainWin;
      return wins.find((w) => w && !w.isDestroyed()) || null;
    } catch {
      return null;
    }
  }

  async readManifest(dirPath) {
    const manifestPath = path.join(dirPath, 'manifest.json');
    const raw = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Invalid manifest.json');
    }
    return manifest;
  }

  resolveLocalizedName(dirPath, rawName, defaultLocale) {
    if (typeof rawName !== 'string') return '';
    const match = rawName.match(/^__MSG_([a-zA-Z0-9_@]+)__$/);
    if (!match) return rawName;
    const msgKey = match[1];
    const localesToTry = [defaultLocale, 'en', 'en_US'].filter(Boolean);
    for (const loc of localesToTry) {
      try {
        const msgFile = path.join(dirPath, '_locales', loc, 'messages.json');
        if (fsSync.existsSync(msgFile)) {
          const msgs = JSON.parse(fsSync.readFileSync(msgFile, 'utf8'));
          const entry = msgs[msgKey] || msgs[msgKey.toLowerCase()];
          if (entry && entry.message) return entry.message;
        }
      } catch (_) {}
    }
    return rawName;
  }

  async resolveIconDataUrl(dirPath, manifest) {
    try {
      const icons = manifest.icons || manifest.action?.default_icon || manifest.browser_action?.default_icon;
      let relIcon = '';
      if (typeof icons === 'string') {
        relIcon = icons;
      } else if (icons && typeof icons === 'object') {
        const preferred = ['128', '64', '48', '32', '16'];
        for (const size of preferred) {
          if (icons[size]) {
            relIcon = icons[size];
            break;
          }
        }
        if (!relIcon) {
          const vals = Object.values(icons).filter((v) => typeof v === 'string');
          relIcon = vals[0] || '';
        }
      }
      if (!relIcon) return null;
      const fullPath = path.resolve(dirPath, relIcon.replace(/^\/+/, ''));
      if (!fullPath.startsWith(path.resolve(dirPath))) return null;
      const buf = await fs.readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  getDefaultActionState(manifest, enabled = true) {
    const action = manifest.action || manifest.browser_action || {};
    return {
      badgeText: '',
      badgeBgColor: '#3b82f6',
      badgeTextColor: '#ffffff',
      title: action.default_title || manifest.name || '',
      popup: action.default_popup || '',
      enabled: Boolean(enabled)
    };
  }

  async ensureMv3CompatShim(entry) {
    if (!entry || !entry.installPath || entry.source === 'unpacked') return;
    if (!this.app) return;

    const extensionsRoot = path.join(this.app.getPath('userData'), 'extensions');
    const installDir = entry.installPath;
    if (!this.isPathInsideDir(extensionsRoot, installDir)) return;

    const shimSrcPath = path.join(__dirname, 'extension_mv3_shim.js');
    const shimDestPath = path.join(installDir, '_qbrowse_mv3_shim.js');
    try {
      const shimContent = await fs.readFile(shimSrcPath, 'utf8');
      let shouldWriteShim = true;
      if (fsSync.existsSync(shimDestPath)) {
        try {
          const existing = await fs.readFile(shimDestPath, 'utf8');
          if (existing === shimContent) shouldWriteShim = false;
        } catch (_) {}
      }
      if (shouldWriteShim) {
        await fs.writeFile(shimDestPath, shimContent, 'utf8');
      }
    } catch (err) {
      console.warn(`[ExtensionEngine] Failed to copy MV3 shim for ${entry.id}:`, err.message);
      return;
    }

    const origManifestPath = path.join(installDir, '_qbrowse_orig_manifest.json');
    const manifestPath = path.join(installDir, 'manifest.json');
    try {
      if (!fsSync.existsSync(origManifestPath) && fsSync.existsSync(manifestPath)) {
        const rawCurrent = await fs.readFile(manifestPath, 'utf8');
        await fs.writeFile(origManifestPath, rawCurrent, 'utf8');
      }
    } catch (err) {
      console.warn(`[ExtensionEngine] Failed to backup manifest for ${entry.id}:`, err.message);
    }

    let origManifest;
    try {
      const sourcePath = fsSync.existsSync(origManifestPath) ? origManifestPath : manifestPath;
      origManifest = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    } catch (err) {
      console.warn(`[ExtensionEngine] Failed to parse manifest for ${entry.id}:`, err.message);
      return;
    }
    if (!origManifest || typeof origManifest !== 'object') return;

    // Wrap MV3 service_worker with _qbrowse_mv3_shim.js
    const swPath = origManifest.background && typeof origManifest.background.service_worker === 'string'
      ? origManifest.background.service_worker.trim()
      : '';
    if (swPath && swPath !== '_qbrowse_sw_entry.js') {
      const relSw = './' + swPath.replace(/^[./\\]+/, '').replace(/\\/g, '/');
      const isModule = origManifest.background.type === 'module';
      const wrapperCode = isModule
        ? `import './_qbrowse_mv3_shim.js';\nimport '${relSw}';\n`
        : `importScripts('./_qbrowse_mv3_shim.js');\nimportScripts('${relSw}');\n`;
      const wrapperPath = path.join(installDir, '_qbrowse_sw_entry.js');
      await fs.writeFile(wrapperPath, wrapperCode, 'utf8');

      const patchedManifest = {
        ...origManifest,
        background: {
          ...origManifest.background,
          service_worker: '_qbrowse_sw_entry.js'
        }
      };
      await fs.writeFile(manifestPath, JSON.stringify(patchedManifest, null, 2), 'utf8');
    }

    // Inject <script src="/_qbrowse_mv3_shim.js"></script> into extension HTML entrypoints
    const htmlCandidates = [
      origManifest.action?.default_popup,
      origManifest.browser_action?.default_popup,
      origManifest.options_page,
      origManifest.options_ui?.page
    ].filter((p) => typeof p === 'string' && p.trim().length > 0);

    for (const relHtml of htmlCandidates) {
      try {
        const cleanRel = relHtml.replace(/^\/+/, '');
        const htmlPath = path.resolve(installDir, cleanRel);
        if (!this.isPathInsideDir(installDir, htmlPath) || !fsSync.existsSync(htmlPath)) continue;
        const html = await fs.readFile(htmlPath, 'utf8');
        if (html.includes('_qbrowse_mv3_shim.js')) continue;

        let patchedHtml = html;
        if (/<head(?:\s[^>]*)?>/i.test(html)) {
          patchedHtml = html.replace(/<head(?:\s[^>]*)?>/i, (m) => `${m}<script src="/_qbrowse_mv3_shim.js"></script>`);
        } else if (/<html(?:\s[^>]*)?>/i.test(html)) {
          patchedHtml = html.replace(/<html(?:\s[^>]*)?>/i, (m) => `${m}<head><script src="/_qbrowse_mv3_shim.js"></script></head>`);
        } else {
          patchedHtml = `<script src="/_qbrowse_mv3_shim.js"></script>${html}`;
        }
        await fs.writeFile(htmlPath, patchedHtml, 'utf8');
      } catch (_) {}
    }
  }

  async loadSingleExtension(entry, profileId) {
    const pid = this.normalizeProfileId(profileId);
    const ses = this.getProfileSession(pid);
    if (!entry || !entry.installPath || !fsSync.existsSync(entry.installPath)) {
      throw new Error(`Extension directory not found: ${entry?.installPath}`);
    }

    await this.ensureMv3CompatShim(entry);

    if (entry.runtimeId) {
      this.runtimeIdToEntry.set(entry.runtimeId, { profileId: pid, extId: entry.id });
      this.extKeyToRuntimeId.set(this.extKey(pid, entry.id), entry.runtimeId);
    }

    const loaded = ses.extensions && typeof ses.extensions.loadExtension === 'function'
      ? await ses.extensions.loadExtension(entry.installPath, { allowFileAccess: false })
      : await ses.loadExtension(entry.installPath, { allowFileAccess: false });

    const runtimeId = loaded.id;
    entry.runtimeId = runtimeId;
    this.runtimeIdToEntry.set(runtimeId, { profileId: pid, extId: entry.id });
    this.extKeyToRuntimeId.set(this.extKey(pid, entry.id), runtimeId);

    const key = this.extKey(pid, entry.id);
    if (!this.actionStates.has(key)) {
      let manifest = {};
      try {
        manifest = await this.readManifest(entry.installPath);
      } catch (_) {}
      this.actionStates.set(key, this.getDefaultActionState(manifest, entry.enabled !== false));
    } else {
      const state = this.actionStates.get(key);
      state.enabled = entry.enabled !== false;
    }

    return loaded;
  }

  async unloadSingleExtension(entry, profileId) {
    const pid = this.normalizeProfileId(profileId);
    const ses = this.getProfileSession(pid);
    const key = this.extKey(pid, entry.id);
    const runtimeId = this.extKeyToRuntimeId.get(key) || entry.runtimeId;
    if (runtimeId) {
      try {
        if (ses.extensions && typeof ses.extensions.removeExtension === 'function') {
          ses.extensions.removeExtension(runtimeId);
        } else if (typeof ses.removeExtension === 'function') {
          ses.removeExtension(runtimeId);
        }
      } catch (err) {
        console.warn(`[ExtensionEngine] removeExtension warning (${runtimeId}):`, err.message);
      }
      this.runtimeIdToEntry.delete(runtimeId);
      this.extKeyToRuntimeId.delete(key);
    }
    this.contextMenus.delete(key);
    this.actionStates.delete(key);
  }

  async initProfileExtensions(profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    this.getProfileSession(pid); // Ensure preloads registered even if 0 extensions
    const profileReg = this.getProfileRegistry(pid);

    for (const extId of Object.keys(profileReg)) {
      const entry = profileReg[extId];
      if (!entry || entry.enabled === false) continue;
      try {
        await this.loadSingleExtension(entry, pid);
      } catch (err) {
        console.warn(`[ExtensionEngine] Failed to load extension ${extId} for profile ${pid}:`, err.message);
      }
    }
  }

  buildExtensionView(entry, profileId) {
    const pid = this.normalizeProfileId(profileId);
    const key = this.extKey(pid, entry.id);
    const runtimeId = this.extKeyToRuntimeId.get(key) || entry.runtimeId || null;
    const actionState = this.actionStates.get(key) || {
      badgeText: '',
      badgeBgColor: '#3b82f6',
      badgeTextColor: '#ffffff',
      title: entry.name || '',
      popup: entry.defaultPopup || '',
      enabled: entry.enabled !== false
    };
    const menusMap = this.contextMenus.get(key);
    const contextMenus = menusMap ? Array.from(menusMap.values()) : [];

    const popupPath = actionState.popup || entry.defaultPopup || '';
    const popupUrl = runtimeId && popupPath
      ? `chrome-extension://${runtimeId}/${String(popupPath).replace(/^\/+/, '')}`
      : null;
    const optionsUrl = runtimeId && entry.optionsPage
      ? `chrome-extension://${runtimeId}/${String(entry.optionsPage).replace(/^\/+/, '')}`
      : null;

    return {
      ...entry,
      iconUrl: entry.iconDataUrl || null,
      isUnpacked: entry.source === 'unpacked',
      profileId: pid,
      runtimeId,
      actionState,
      contextMenus,
      popupUrl,
      optionsUrl
    };
  }

  async listExtensions(profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const profileReg = this.getProfileRegistry(pid);
    return Object.values(profileReg).map((entry) => this.buildExtensionView(entry, pid));
  }

  extractCwsId(input) {
    const str = String(input || '').trim();
    if (CWS_ID_RE.test(str)) return str;
    const match = str.match(/\/([a-p]{32})(?:[/?#]|$)/);
    if (match && match[1]) return match[1];
    throw new Error('Invalid Chrome Web Store extension ID');
  }

  async previewCwsExtension(rawExtId, profileId = 'default') {
    this.normalizeProfileId(profileId); // validates not ghost/tor
    const extId = this.extractCwsId(rawExtId);
    if (!this.rustBridge || typeof this.rustBridge.extDownloadAndUnpackCws !== 'function') {
      throw new Error('Rust CWS extension unpacker is not available');
    }

    const stagingRoot = path.join(this.app.getPath('userData'), 'extensions', '_staging');
    const stagedDir = path.join(stagingRoot, `${extId}_${Date.now()}`);
    await fs.mkdir(stagedDir, { recursive: true });

    const chromeVersion = (process.versions && process.versions.chrome)
      ? String(process.versions.chrome)
      : '136.0.0.0';
    const unpackRes = await this.rustBridge.extDownloadAndUnpackCws(extId, chromeVersion, stagedDir);
    const resolvedDir = (unpackRes && typeof unpackRes === 'object' && (unpackRes.path || unpackRes.unpackedPath))
      ? (unpackRes.path || unpackRes.unpackedPath)
      : (typeof unpackRes === 'string' ? unpackRes : stagedDir);

    const manifest = await this.readManifest(resolvedDir);
    const name = this.resolveLocalizedName(resolvedDir, manifest.name, manifest.default_locale) || extId;
    const description = this.resolveLocalizedName(resolvedDir, manifest.description, manifest.default_locale) || '';
    const iconDataUrl = (unpackRes && typeof unpackRes === 'object' && unpackRes.iconDataUrl)
      ? unpackRes.iconDataUrl
      : await this.resolveIconDataUrl(resolvedDir, manifest);

    this.stagedPaths.set(extId, { resolvedDir, stagingParent: stagedDir });

    return {
      extId,
      stagedPath: resolvedDir,
      name,
      version: String(manifest.version || '0.0.0'),
      description,
      manifestVersion: Number(manifest.manifest_version || 3),
      permissions: Array.isArray(manifest.permissions) ? manifest.permissions : [],
      hostPermissions: Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [],
      iconDataUrl,
      iconUrl: iconDataUrl
    };
  }

  async copyDirRecursive(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirRecursive(srcPath, destPath);
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async confirmInstallCws(rawExtId, stagedPath, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const extId = this.extractCwsId(rawExtId);
    const stagingRoot = path.join(this.app.getPath('userData'), 'extensions', '_staging');
    const cachedStage = this.stagedPaths.get(extId);
    const candidateStage = stagedPath || cachedStage?.resolvedDir || '';
    const resolvedStage = candidateStage ? path.resolve(String(candidateStage)) : '';

    if (!resolvedStage || !this.isPathInsideDir(stagingRoot, resolvedStage) || !fsSync.existsSync(resolvedStage)) {
      throw new Error('Invalid or expired extension staging path');
    }

    const manifest = await this.readManifest(resolvedStage);
    const safeVersion = String(manifest.version || '0.0.0').replace(/[^a-zA-Z0-9._-]/g, '_') || '0.0.0';
    const destDir = path.join(this.app.getPath('userData'), 'extensions', pid, extId, safeVersion);

    const profileReg = this.getProfileRegistry(pid);
    if (profileReg[extId]) {
      await this.unloadSingleExtension(profileReg[extId], pid);
    }

    await fs.rm(destDir, { recursive: true, force: true });
    await fs.mkdir(path.dirname(destDir), { recursive: true });
    try {
      await fs.rename(resolvedStage, destDir);
    } catch {
      await this.copyDirRecursive(resolvedStage, destDir);
      await fs.rm(resolvedStage, { recursive: true, force: true }).catch(() => {});
    }

    if (cachedStage?.stagingParent && this.isPathInsideDir(stagingRoot, cachedStage.stagingParent)) {
      await fs.rm(cachedStage.stagingParent, { recursive: true, force: true }).catch(() => {});
    }
    this.stagedPaths.delete(extId);

    const entry = await this.buildRegistryEntry(extId, destDir, manifest, 'cws');
    profileReg[extId] = entry;
    await this.loadSingleExtension(entry, pid);
    await this.saveRegistry();

    const list = await this.listExtensions(pid);
    this.broadcastToShells('ext-list-changed', { profileId: pid, extensions: list });
    return this.buildExtensionView(entry, pid);
  }

  async installCwsDirect(rawExtId, opts = {}, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const extId = this.extractCwsId(rawExtId);
    const preview = await this.previewCwsExtension(extId, pid);
    let view = await this.confirmInstallCws(extId, preview.stagedPath, pid);
    if (opts && typeof opts === 'object') {
      if (typeof opts.enabled === 'boolean' && opts.enabled === false) {
        view = await this.setExtensionEnabled(extId, false, pid);
      }
      if (typeof opts.pinned === 'boolean') {
        view = await this.setExtensionPinned(extId, opts.pinned, pid);
      }
    }
    return view;
  }

  async buildRegistryEntry(extId, installPath, manifest, source) {
    const name = this.resolveLocalizedName(installPath, manifest.name, manifest.default_locale) || extId;
    const description = this.resolveLocalizedName(installPath, manifest.description, manifest.default_locale) || '';
    const iconDataUrl = await this.resolveIconDataUrl(installPath, manifest);
    const action = manifest.action || manifest.browser_action || {};
    const optionsPage = manifest.options_ui?.page || manifest.options_page || '';

    return {
      id: extId,
      runtimeId: null,
      name,
      version: String(manifest.version || '0.0.0'),
      description,
      manifestVersion: Number(manifest.manifest_version || 3),
      enabled: true,
      pinned: false,
      source,
      installPath,
      permissions: Array.isArray(manifest.permissions) ? manifest.permissions : [],
      hostPermissions: Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [],
      iconDataUrl,
      defaultPopup: action.default_popup || '',
      defaultTitle: action.default_title || name,
      optionsPage,
      installedAt: Date.now()
    };
  }

  async installUnpackedExtension(dirPath, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const resolvedDir = path.resolve(String(dirPath || ''));
    const manifest = await this.readManifest(resolvedDir);

    const ses = this.getProfileSession(pid);
    const loaded = ses.extensions && typeof ses.extensions.loadExtension === 'function'
      ? await ses.extensions.loadExtension(resolvedDir, { allowFileAccess: false })
      : await ses.loadExtension(resolvedDir, { allowFileAccess: false });

    const extId = loaded.id;
    const profileReg = this.getProfileRegistry(pid);
    const entry = await this.buildRegistryEntry(extId, resolvedDir, manifest, 'unpacked');
    entry.runtimeId = extId;

    profileReg[extId] = entry;
    this.runtimeIdToEntry.set(extId, { profileId: pid, extId });
    this.extKeyToRuntimeId.set(this.extKey(pid, extId), extId);
    this.actionStates.set(this.extKey(pid, extId), this.getDefaultActionState(manifest, true));

    await this.saveRegistry();
    const list = await this.listExtensions(pid);
    this.broadcastToShells('ext-list-changed', { profileId: pid, extensions: list });
    return this.buildExtensionView(entry, pid);
  }

  async setExtensionEnabled(extId, enabled, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const profileReg = this.getProfileRegistry(pid);
    const entry = profileReg[extId];
    if (!entry) throw new Error(`Extension not found: ${extId}`);

    const nextEnabled = Boolean(enabled);
    entry.enabled = nextEnabled;

    if (nextEnabled) {
      await this.loadSingleExtension(entry, pid);
    } else {
      await this.unloadSingleExtension(entry, pid);
      entry.runtimeId = null;
    }

    await this.saveRegistry();
    const list = await this.listExtensions(pid);
    this.broadcastToShells('ext-list-changed', { profileId: pid, extensions: list });
    return this.buildExtensionView(entry, pid);
  }

  async setExtensionPinned(extId, pinned, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const profileReg = this.getProfileRegistry(pid);
    const entry = profileReg[extId];
    if (!entry) throw new Error(`Extension not found: ${extId}`);

    entry.pinned = Boolean(pinned);
    await this.saveRegistry();
    const list = await this.listExtensions(pid);
    this.broadcastToShells('ext-list-changed', { profileId: pid, extensions: list });
    return this.buildExtensionView(entry, pid);
  }

  async reloadExtension(extId, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const profileReg = this.getProfileRegistry(pid);
    const entry = profileReg[extId];
    if (!entry) throw new Error(`Extension not found: ${extId}`);

    await this.unloadSingleExtension(entry, pid);
    if (entry.enabled !== false) {
      const manifest = await this.readManifest(entry.installPath);
      entry.version = String(manifest.version || entry.version);
      entry.name = this.resolveLocalizedName(entry.installPath, manifest.name, manifest.default_locale) || entry.name;
      await this.loadSingleExtension(entry, pid);
    }

    await this.saveRegistry();
    const list = await this.listExtensions(pid);
    this.broadcastToShells('ext-list-changed', { profileId: pid, extensions: list });
    return this.buildExtensionView(entry, pid);
  }

  async removeExtension(extId, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const profileReg = this.getProfileRegistry(pid);
    const entry = profileReg[extId];
    if (!entry) return { removed: false };

    await this.unloadSingleExtension(entry, pid);
    delete profileReg[extId];

    if (entry.source === 'cws' && entry.installPath) {
      const managedRoot = path.resolve(path.join(this.app.getPath('userData'), 'extensions', pid, extId));
      const resolvedInstall = path.resolve(entry.installPath);
      if (resolvedInstall.startsWith(managedRoot)) {
        await fs.rm(managedRoot, { recursive: true, force: true }).catch(() => {});
      }
    }

    await this.saveRegistry();
    const list = await this.listExtensions(pid);
    this.broadcastToShells('ext-list-changed', { profileId: pid, extensions: list });
    return { removed: true };
  }

  getPopupUrl(extId, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const profileReg = this.getProfileRegistry(pid);
    const entry = profileReg[extId];
    if (!entry) return null;
    const key = this.extKey(pid, extId);
    const runtimeId = this.extKeyToRuntimeId.get(key) || entry.runtimeId;
    if (!runtimeId) return null;
    const state = this.actionStates.get(key);
    const popup = (state && state.popup) || entry.defaultPopup || '';
    if (!popup) return null;
    return `chrome-extension://${runtimeId}/${String(popup).replace(/^\/+/, '')}`;
  }

  getOptionsUrl(extId, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const profileReg = this.getProfileRegistry(pid);
    const entry = profileReg[extId];
    if (!entry || !entry.optionsPage) return null;
    const key = this.extKey(pid, extId);
    const runtimeId = this.extKeyToRuntimeId.get(key) || entry.runtimeId;
    if (!runtimeId) return null;
    return `chrome-extension://${runtimeId}/${String(entry.optionsPage).replace(/^\/+/, '')}`;
  }

  dispatchEventToExtension(runtimeId, eventName, args) {
    if (!runtimeId) return;
    const prefix = `chrome-extension://${runtimeId}/`;
    const payload = { eventName, args: Array.isArray(args) ? args : [] };
    try {
      for (const wc of webContents.getAllWebContents()) {
        if (!wc || wc.isDestroyed()) continue;
        const url = wc.getURL() || '';
        if (url.startsWith(prefix)) {
          wc.send('qbrowse-ext-event', payload);
        }
      }
    } catch (_) {}
    try {
      const mapped = this.runtimeIdToEntry.get(runtimeId);
      if (mapped && mapped.profileId) {
        const ses = this.getProfileSession(mapped.profileId);
        if (ses && ses.serviceWorkers && typeof ses.serviceWorkers.getAllRunning === 'function') {
          const running = ses.serviceWorkers.getAllRunning() || {};
          for (const sw of Object.values(running)) {
            const scope = (sw && (sw.scope || sw.scriptUrl)) || '';
            if (scope.startsWith(prefix) && sw.ipc && typeof sw.ipc.send === 'function') {
              sw.ipc.send('qbrowse-ext-event', payload);
            }
          }
        }
      }
    } catch (_) {}
  }

  broadcastExtensionEvent(eventName, payload, profileId = null) {
    if (!eventName) return;
    const args = Array.isArray(payload)
      ? payload
      : (payload && Array.isArray(payload.args) ? payload.args : (payload !== undefined ? [payload] : []));
    const msg = { eventName, args };

    let allowedRuntimeIds = null;
    if (profileId) {
      try {
        const pid = this.normalizeProfileId(profileId);
        allowedRuntimeIds = new Set();
        for (const [rtId, entry] of this.runtimeIdToEntry.entries()) {
          if (entry && entry.profileId === pid) allowedRuntimeIds.add(rtId);
        }
      } catch (_) {
        return;
      }
    }

    const matchesRuntime = (url) => {
      if (typeof url !== 'string' || !url.startsWith('chrome-extension://')) return false;
      if (!allowedRuntimeIds) return true;
      try {
        const host = new URL(url).hostname;
        return allowedRuntimeIds.has(host);
      } catch (_) {
        return false;
      }
    };

    try {
      for (const wc of webContents.getAllWebContents()) {
        if (!wc || wc.isDestroyed()) continue;
        const url = wc.getURL() || '';
        if (matchesRuntime(url)) {
          wc.send('qbrowse-ext-event', msg);
        }
      }
    } catch (_) {}

    try {
      const profileIds = profileId ? [this.normalizeProfileId(profileId)] : Object.keys(this.registry || {});
      for (const pid of profileIds) {
        const ses = this.getProfileSession(pid);
        if (ses && ses.serviceWorkers && typeof ses.serviceWorkers.getAllRunning === 'function') {
          const running = ses.serviceWorkers.getAllRunning() || {};
          for (const sw of Object.values(running)) {
            const scope = (sw && (sw.scope || sw.scriptUrl)) || '';
            if (matchesRuntime(scope) && sw.ipc && typeof sw.ipc.send === 'function') {
              sw.ipc.send('qbrowse-ext-event', msg);
            }
          }
        }
      }
    } catch (_) {}
  }

  notifyNavigation(profileId, eventType, details = {}) {
    if (!eventType) return;
    let pid = null;
    if (profileId) {
      try {
        pid = this.normalizeProfileId(profileId);
      } catch (_) {
        return;
      }
    }

    const eventMap = {
      'did-start-navigation': 'webNavigation.onBeforeNavigate',
      'before-navigate': 'webNavigation.onBeforeNavigate',
      'onBeforeNavigate': 'webNavigation.onBeforeNavigate',
      'did-navigate': 'webNavigation.onCommitted',
      'committed': 'webNavigation.onCommitted',
      'onCommitted': 'webNavigation.onCommitted',
      'dom-ready': 'webNavigation.onDOMContentLoaded',
      'onDOMContentLoaded': 'webNavigation.onDOMContentLoaded',
      'did-finish-load': 'webNavigation.onCompleted',
      'completed': 'webNavigation.onCompleted',
      'onCompleted': 'webNavigation.onCompleted',
      'did-navigate-in-page': 'webNavigation.onHistoryStateUpdated',
      'history-state-updated': 'webNavigation.onHistoryStateUpdated',
      'onHistoryStateUpdated': 'webNavigation.onHistoryStateUpdated'
    };

    const webNavEvent = eventMap[eventType];
    const url = String(details.url || '');
    const tabId = details.tabId ?? -1;
    const navDetails = {
      tabId,
      url,
      frameId: details.frameId ?? 0,
      parentFrameId: details.parentFrameId ?? -1,
      processId: details.processId ?? -1,
      timeStamp: Date.now(),
      transitionType: details.transitionType || 'link',
      transitionQualifiers: Array.isArray(details.transitionQualifiers) ? details.transitionQualifiers : []
    };

    if (webNavEvent) {
      this.broadcastExtensionEvent(webNavEvent, [navDetails], pid);
    }

    let changeInfo = null;
    if (eventType === 'did-start-navigation' || eventType === 'before-navigate' || eventType === 'did-navigate' || eventType === 'committed') {
      changeInfo = { status: 'loading', ...(url ? { url } : {}) };
    } else if (eventType === 'did-finish-load' || eventType === 'completed') {
      changeInfo = { status: 'complete', ...(url ? { url } : {}) };
    } else if (eventType === 'did-navigate-in-page' || eventType === 'history-state-updated') {
      changeInfo = { ...(url ? { url } : {}) };
    }

    if (changeInfo) {
      const matchedTab = this.getAllTabs().find((t) => t.id === tabId || (url && t.url === url)) || {
        id: tabId,
        index: 0,
        windowId: 1,
        active: true,
        pinned: false,
        url,
        title: '',
        status: changeInfo.status || 'complete'
      };
      this.broadcastExtensionEvent('tabs.onUpdated', [matchedTab.id, changeInfo, matchedTab], pid);
    }
  }

  async triggerActionClick(extId, tabInfo = {}, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const popupUrl = this.getPopupUrl(extId, pid);
    const runtimeId = this.extKeyToRuntimeId.get(this.extKey(pid, extId));
    if (popupUrl) {
      return { hasPopup: true, popupUrl, extId, runtimeId };
    }
    if (runtimeId) {
      const tab = tabInfo && typeof tabInfo === 'object' ? tabInfo : {};
      this.dispatchEventToExtension(runtimeId, 'action.onClicked', [tab]);
    }
    return { hasPopup: false, extId, runtimeId };
  }

  async triggerContextMenuClick(extId, menuItemId, info = {}, profileId = 'default') {
    const pid = this.normalizeProfileId(profileId);
    const runtimeId = this.extKeyToRuntimeId.get(this.extKey(pid, extId));
    if (runtimeId) {
      const activeTab = this.getAllTabs()[0] || null;
      this.dispatchEventToExtension(runtimeId, 'contextMenus.onClicked', [{ ...info, menuItemId }, activeTab]);
    }
    return { dispatched: Boolean(runtimeId) };
  }

  syncTabs(windowId, tabs) {
    const winKey = String(windowId ?? 'default');
    this.tabsByWindow.set(winKey, Array.isArray(tabs) ? tabs : []);
    this.lastFocusedWindowId = winKey;
    return { ok: true };
  }

  getAllTabs() {
    const all = [];
    for (const [winId, tabs] of this.tabsByWindow.entries()) {
      for (let i = 0; i < tabs.length; i++) {
        const t = tabs[i];
        if (!t) continue;
        all.push({
          id: t.id,
          index: typeof t.index === 'number' ? t.index : i,
          windowId: t.windowId ?? (Number(winId) || 1),
          active: Boolean(t.active),
          pinned: Boolean(t.pinned),
          url: String(t.url || ''),
          title: String(t.title || ''),
          favIconUrl: t.favIconUrl || t.favicon || '',
          incognito: Boolean(t.incognito || t.isGhost || t.isTor),
          status: t.isLoading ? 'loading' : 'complete'
        });
      }
    }
    return all;
  }

  extractExtensionSender(event) {
    const candidates = [
      event?.senderFrame?.url,
      typeof event?.sender?.getURL === 'function' ? event.sender.getURL() : null,
      event?.sender?.scope,
      event?.sender?.url
    ];
    for (const raw of candidates) {
      if (typeof raw === 'string' && raw.startsWith('chrome-extension://')) {
        try {
          const parsed = new URL(raw);
          if (parsed.protocol === 'chrome-extension:' && parsed.hostname) {
            return { originUrl: raw, runtimeId: parsed.hostname };
          }
        } catch (_) {}
      }
    }
    return null;
  }

  resolveSenderExtension(runtimeId) {
    const mapped = this.runtimeIdToEntry.get(runtimeId);
    if (mapped) return mapped;
    return { profileId: 'default', extId: runtimeId };
  }

  sendTabCommand(command) {
    const targetWin = this.getActiveShellWindow();
    if (targetWin && !targetWin.isDestroyed()) {
      targetWin.webContents.send('ext-tab-command', command);
    }
  }

  async handleExtensionApiCall(runtimeId, method, args = []) {
    const { profileId, extId } = this.resolveSenderExtension(runtimeId);
    const ses = this.getProfileSession(profileId);
    const key = this.extKey(profileId, extId);
    const safeArgs = Array.isArray(args) ? args : [];

    const enrichTab = (t) => {
      if (!t || typeof t !== 'object') return t;
      if (typeof t.id === 'number') {
        try {
          const wc = webContents.fromId(t.id);
          if (wc && !wc.isDestroyed()) {
            const liveUrl = wc.getURL();
            const liveTitle = wc.getTitle();
            return {
              ...t,
              url: liveUrl || t.url,
              title: liveTitle || t.title
            };
          }
        } catch (_) {}
      }
      return t;
    };

    switch (String(method || '')) {
      case 'tabs.query': {
        const q = (safeArgs[0] && typeof safeArgs[0] === 'object') ? safeArgs[0] : {};
        let tabs = this.getAllTabs().map(enrichTab);
        if (typeof q.active === 'boolean') tabs = tabs.filter((t) => t.active === q.active);
        if (typeof q.pinned === 'boolean') tabs = tabs.filter((t) => t.pinned === q.pinned);
        if (typeof q.windowId === 'number' && q.windowId >= 0) tabs = tabs.filter((t) => t.windowId === q.windowId);
        if (q.currentWindow) {
          const winId = Number(this.lastFocusedWindowId) || 1;
          tabs = tabs.filter((t) => t.windowId === winId);
        }
        if (typeof q.url === 'string') {
          const pattern = q.url.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
          const re = new RegExp(`^${pattern}$`);
          tabs = tabs.filter((t) => re.test(t.url));
        }
        return tabs;
      }
      case 'tabs.get': {
        const tabId = safeArgs[0];
        const found = this.getAllTabs().find((t) => t.id === tabId);
        return found ? enrichTab(found) : null;
      }
      case 'tabs.create': {
        const props = (safeArgs[0] && typeof safeArgs[0] === 'object') ? safeArgs[0] : {};
        const tempId = crypto.randomInt(100000, 9999999);
        this.sendTabCommand({ type: 'create', action: 'create', ...props, extId, tempId });
        return { id: tempId, url: props.url || 'qbrowse://newtab', active: props.active !== false };
      }
      case 'tabs.update': {
        const tabId = typeof safeArgs[0] === 'number' || typeof safeArgs[0] === 'string' ? safeArgs[0] : null;
        const props = (tabId !== null ? safeArgs[1] : safeArgs[0]) || {};
        this.sendTabCommand({ type: 'update', action: 'update', tabId, ...props, extId });
        return this.getAllTabs().find((t) => t.id === tabId) || { id: tabId, ...props };
      }
      case 'tabs.remove': {
        const tabIds = Array.isArray(safeArgs[0]) ? safeArgs[0] : [safeArgs[0]];
        this.sendTabCommand({ type: 'remove', action: 'remove', tabIds, extId });
        return undefined;
      }
      case 'tabs.reload': {
        const tabId = safeArgs[0] ?? null;
        const reloadProps = safeArgs[1] || {};
        this.sendTabCommand({ type: 'reload', action: 'reload', tabId, ...reloadProps, extId });
        return undefined;
      }

      case 'windows.getCurrent':
      case 'windows.getLastFocused': {
        const win = this.getActiveShellWindow();
        return win ? { id: win.id, focused: win.isFocused(), type: 'normal', state: win.isMaximized() ? 'maximized' : 'normal' } : { id: 1, focused: true, type: 'normal' };
      }
      case 'windows.getAll': {
        const wins = typeof this.helpers?.getBrowserWindows === 'function'
          ? Array.from(this.helpers.getBrowserWindows() || [])
          : [];
        return wins.filter((w) => w && !w.isDestroyed()).map((w) => ({
          id: w.id,
          focused: w.isFocused(),
          type: 'normal',
          state: w.isMaximized() ? 'maximized' : 'normal'
        }));
      }
      case 'windows.create': {
        const createData = (safeArgs[0] && typeof safeArgs[0] === 'object') ? safeArgs[0] : {};
        this.sendTabCommand({ type: 'windows.create', action: 'windows.create', ...createData, extId });
        return { id: Date.now(), type: 'normal', tabs: [] };
      }
      case 'windows.update': {
        const winId = safeArgs[0];
        const updateInfo = safeArgs[1] || {};
        return { id: winId, ...updateInfo };
      }

      case 'action.setBadgeText': {
        const details = safeArgs[0] || {};
        const state = this.actionStates.get(key) || this.getDefaultActionState({}, true);
        state.badgeText = String(details.text ?? '');
        this.actionStates.set(key, state);
        this.broadcastToShells('ext-action-state-changed', { profileId, extId, actionState: state });
        return undefined;
      }
      case 'action.getBadgeText': {
        const state = this.actionStates.get(key);
        return state ? state.badgeText : '';
      }
      case 'action.setBadgeBackgroundColor': {
        const details = safeArgs[0] || {};
        const state = this.actionStates.get(key) || this.getDefaultActionState({}, true);
        state.badgeBgColor = Array.isArray(details.color)
          ? `rgba(${details.color[0]},${details.color[1]},${details.color[2]},${(details.color[3] ?? 255) / 255})`
          : String(details.color || '#3b82f6');
        this.actionStates.set(key, state);
        this.broadcastToShells('ext-action-state-changed', { profileId, extId, actionState: state });
        return undefined;
      }
      case 'action.setBadgeTextColor': {
        const details = safeArgs[0] || {};
        const state = this.actionStates.get(key) || this.getDefaultActionState({}, true);
        state.badgeTextColor = Array.isArray(details.color)
          ? `rgba(${details.color[0]},${details.color[1]},${details.color[2]},${(details.color[3] ?? 255) / 255})`
          : String(details.color || '#ffffff');
        this.actionStates.set(key, state);
        this.broadcastToShells('ext-action-state-changed', { profileId, extId, actionState: state });
        return undefined;
      }
      case 'action.setTitle': {
        const details = safeArgs[0] || {};
        const state = this.actionStates.get(key) || this.getDefaultActionState({}, true);
        state.title = String(details.title ?? '');
        this.actionStates.set(key, state);
        this.broadcastToShells('ext-action-state-changed', { profileId, extId, actionState: state });
        return undefined;
      }
      case 'action.setPopup': {
        const details = safeArgs[0] || {};
        const state = this.actionStates.get(key) || this.getDefaultActionState({}, true);
        state.popup = String(details.popup ?? '');
        this.actionStates.set(key, state);
        this.broadcastToShells('ext-action-state-changed', { profileId, extId, actionState: state });
        return undefined;
      }
      case 'action.getPopup': {
        const state = this.actionStates.get(key);
        return state ? state.popup : '';
      }

      case 'cookies.get': {
        const details = safeArgs[0] || {};
        const cookies = await ses.cookies.get({ url: details.url, name: details.name });
        return cookies[0] || null;
      }
      case 'cookies.getAll': {
        const details = safeArgs[0] || {};
        return await ses.cookies.get(details);
      }
      case 'cookies.set': {
        const details = safeArgs[0] || {};
        await ses.cookies.set(details);
        const cookies = await ses.cookies.get({ url: details.url, name: details.name });
        return cookies[0] || null;
      }
      case 'cookies.remove': {
        const details = safeArgs[0] || {};
        await ses.cookies.remove(details.url, details.name);
        return { url: details.url, name: details.name };
      }

      case 'contextMenus.create': {
        const props = safeArgs[0] || {};
        const menuMap = this.contextMenus.get(key) || new Map();
        const menuId = String(props.id || `menu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
        menuMap.set(menuId, { ...props, id: menuId });
        this.contextMenus.set(key, menuMap);
        this.broadcastToShells('ext-context-menus-changed', {
          profileId,
          extId,
          contextMenus: Array.from(menuMap.values())
        });
        return menuId;
      }
      case 'contextMenus.update': {
        const menuId = String(safeArgs[0]);
        const props = safeArgs[1] || {};
        const menuMap = this.contextMenus.get(key);
        if (menuMap && menuMap.has(menuId)) {
          menuMap.set(menuId, { ...menuMap.get(menuId), ...props, id: menuId });
          this.broadcastToShells('ext-context-menus-changed', {
            profileId,
            extId,
            contextMenus: Array.from(menuMap.values())
          });
        }
        return undefined;
      }
      case 'contextMenus.remove': {
        const menuId = String(safeArgs[0]);
        const menuMap = this.contextMenus.get(key);
        if (menuMap) {
          menuMap.delete(menuId);
          this.broadcastToShells('ext-context-menus-changed', {
            profileId,
            extId,
            contextMenus: Array.from(menuMap.values())
          });
        }
        return undefined;
      }
      case 'contextMenus.removeAll': {
        this.contextMenus.delete(key);
        this.broadcastToShells('ext-context-menus-changed', {
          profileId,
          extId,
          contextMenus: []
        });
        return undefined;
      }

      case 'notifications.create': {
        const notifId = typeof safeArgs[0] === 'string' ? safeArgs[0] : `notif_${Date.now()}`;
        const opts = typeof safeArgs[0] === 'object' ? safeArgs[0] : (safeArgs[1] || {});
        try {
          if (Notification.isSupported()) {
            const n = new Notification({
              title: String(opts.title || 'QBrowse Extension'),
              body: String(opts.message || '')
            });
            n.show();
          }
        } catch (_) {}
        return notifId;
      }
      case 'notifications.clear': {
        return true;
      }

      case 'runtime.openOptionsPage': {
        const optionsUrl = this.getOptionsUrl(extId, profileId);
        if (optionsUrl) {
          this.sendTabCommand({ type: 'create', action: 'create', url: optionsUrl, active: true, extId });
        }
        return undefined;
      }

      default:
        throw new Error(`Unsupported qbrowse-ext-api method: ${method}`);
    }
  }

  registerExtensionApiIpc() {
    if (this.ipcRegistered) return;
    this.ipcRegistered = true;

    ipcMain.handle('qbrowse-ext-api', async (event, payload = {}) => {
      const senderInfo = this.extractExtensionSender(event);
      if (!senderInfo) {
        throw new Error('Unauthorized IPC sender: chrome-extension:// origin required');
      }

      const method = String(payload.method || '');
      const args = Array.isArray(payload.args) ? payload.args : [];
      return await this.handleExtensionApiCall(senderInfo.runtimeId, method, args);
    });
  }
}

module.exports = new ExtensionEngine();
