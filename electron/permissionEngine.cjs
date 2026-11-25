const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const crypto = require('crypto');
const rustBridge = require('./rustBridge.cjs');

const AUTO_ALLOW_PERMISSIONS = new Set([
    'fullscreen',
    'clipboard-sanitized-write',
    'mediaKeySystem',
    'pointerLock',
    'screen-wake-lock',
    'storage-access',
    'top-level-storage-access',
    'keyboardLock',
    'publickey-credentials-get',
    'publickey-credentials-create'
]);

const CHECK_AUTO_ALLOW_PERMISSIONS = new Set([
    ...AUTO_ALLOW_PERMISSIONS,
    'hid',
    'usb',
    'serial'
]);

const VALID_DECISIONS = new Set(['allow', 'block', 'ask']);

const PERMISSION_ALIASES = {
    clipboard: 'clipboard-read',
    audioCapture: 'microphone',
    videoCapture: 'camera',
    midiSysex: 'midi'
};

/**
 * Extract a canonical origin string from a URL, origin, or bare domain.
 * Examples:
 *  - "https://meet.google.com/abc" -> "https://meet.google.com"
 *  - "http://localhost:3000/test"  -> "http://localhost:3000"
 *  - "example.com"                 -> "https://example.com"
 *  - "file:///C:/index.html"       -> "file://"
 *  - "about:blank" / ""            -> ""
 */
function extractOrigin(input) {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    const lower = trimmed.toLowerCase();
    if (
        lower === 'about:blank' ||
        lower.startsWith('about:') ||
        lower.startsWith('javascript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('blob:')
    ) {
        return '';
    }

    if (lower.startsWith('file://')) {
        return 'file://';
    }

    try {
        const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
        const parsed = new URL(candidate);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            if (!parsed.hostname) return '';
            return parsed.origin.toLowerCase();
        }
        if (parsed.protocol === 'file:') {
            return 'file://';
        }
        if (parsed.origin && parsed.origin !== 'null') {
            return parsed.origin.toLowerCase();
        }
        return '';
    } catch (_) {
        return '';
    }
}

/**
 * Human-readable host label for UI display.
 */
function getDisplayHost(originOrUrl) {
    const origin = extractOrigin(originOrUrl);
    if (!origin) return 'Website';
    if (origin === 'file://') return 'Local File';
    try {
        const parsed = new URL(origin);
        return parsed.host || parsed.hostname || origin;
    } catch (_) {
        return origin;
    }
}

/**
 * Normalize a permission name (e.g. legacy "clipboard" -> "clipboard-read").
 */
function normalizeSinglePermissionKey(permission) {
    if (!permission || typeof permission !== 'string') return '';
    const trimmed = permission.trim();
    return PERMISSION_ALIASES[trimmed] || trimmed;
}

/**
 * Normalize an Electron `setPermissionRequestHandler(wc, permission, cb, details)` call
 * into canonical keys and prompt type.
 *
 * Returns: { action: 'allow' | 'deny' | 'prompt', keys: string[], promptType: string }
 */
function normalizePermissionRequest(permission, details = {}) {
    if (!permission || typeof permission !== 'string') {
        return { action: 'deny', keys: [], promptType: '' };
    }

    if (AUTO_ALLOW_PERMISSIONS.has(permission)) {
        return { action: 'allow', keys: [], promptType: permission };
    }

    if (permission === 'media') {
        const rawTypes = Array.isArray(details?.mediaTypes) ? details.mediaTypes : [];
        const hasVideo = rawTypes.includes('video');
        const hasAudio = rawTypes.includes('audio');

        if (hasVideo && hasAudio) {
            return { action: 'prompt', keys: ['camera', 'microphone'], promptType: 'camera-microphone' };
        }
        if (hasVideo) {
            return { action: 'prompt', keys: ['camera'], promptType: 'camera' };
        }
        if (hasAudio) {
            return { action: 'prompt', keys: ['microphone'], promptType: 'microphone' };
        }

        // Fallback if mediaTypes is omitted/empty (e.g. generic media request or check-style mediaType)
        if (details?.mediaType === 'video') {
            return { action: 'prompt', keys: ['camera'], promptType: 'camera' };
        }
        if (details?.mediaType === 'audio') {
            return { action: 'prompt', keys: ['microphone'], promptType: 'microphone' };
        }
        return { action: 'prompt', keys: ['camera', 'microphone'], promptType: 'camera-microphone' };
    }

    const canonical = normalizeSinglePermissionKey(permission);
    return { action: 'prompt', keys: [canonical], promptType: canonical };
}

/**
 * Normalize an Electron `setPermissionCheckHandler(wc, permission, origin, details)` call.
 *
 * Returns: { action: 'allow' | 'deny' | 'check', keys: string[], matchMode: 'all' | 'any' }
 */
function normalizePermissionCheck(permission, details = {}) {
    if (!permission || typeof permission !== 'string') {
        return { action: 'deny', keys: [], matchMode: 'all' };
    }

    if (CHECK_AUTO_ALLOW_PERMISSIONS.has(permission)) {
        return { action: 'allow', keys: [], matchMode: 'all' };
    }

    if (permission === 'media') {
        const mediaType = details?.mediaType;
        if (mediaType === 'video') {
            return { action: 'check', keys: ['camera'], matchMode: 'all' };
        }
        if (mediaType === 'audio') {
            return { action: 'check', keys: ['microphone'], matchMode: 'all' };
        }
        // When mediaType is 'unknown' or omitted (e.g. device enumeration check),
        // treat as granted if either camera or microphone has been explicitly allowed.
        return { action: 'check', keys: ['camera', 'microphone'], matchMode: 'any' };
    }

    const canonical = normalizeSinglePermissionKey(permission);
    return { action: 'check', keys: [canonical], matchMode: 'all' };
}

function getPromptTypeForKeys(keys, fallback = '') {
    if (!Array.isArray(keys) || keys.length === 0) return fallback;
    if (keys.length === 2 && keys.includes('camera') && keys.includes('microphone')) {
        return 'camera-microphone';
    }
    return keys[0] || fallback;
}

class PermissionManager {
    constructor(options = {}) {
        this.userDataPath = options.userDataPath || '';
        this.filePath = options.filePath || (this.userDataPath ? path.join(this.userDataPath, 'site-permissions.json') : '');
        this.legacyFilePath = options.legacyFilePath || (this.userDataPath ? path.join(this.userDataPath, 'permissions.json') : '');
        this.promptTimeoutMs = typeof options.promptTimeoutMs === 'number' ? options.promptTimeoutMs : 60000;
        this.onChange = typeof options.onChange === 'function' ? options.onChange : null;

        // Persistent decisions: { [origin]: { [permKey]: 'allow' | 'block' } }
        this.persistentStore = {};

        // Ephemeral & "Allow once" session decisions (in-memory only, NEVER saved to disk):
        // Map<sessionKey, Map<origin, Map<permKey, 'allow' | 'block'>>>
        this.sessionDecisions = new Map();

        // Active pending permission prompts:
        // Map<requestId, PendingEntry> and Map<dedupeKey, requestId>
        this.pendingById = new Map();
        this.pendingByDedupeKey = new Map();

        // Session object -> stable sessionKey
        this.sessionKeys = new WeakMap();
        this.sessionCounter = 0;

        this._writeChain = Promise.resolve();
        this.loadSync();
    }

    registerSession(sess, key) {
        if (!sess || typeof sess !== 'object') return key || 'default';
        if (key && typeof key === 'string') {
            this.sessionKeys.set(sess, key);
            return key;
        }
        const existing = this.sessionKeys.get(sess);
        if (existing) return existing;

        const isPersistent = typeof sess.isPersistent === 'function' ? sess.isPersistent() : true;
        const storagePath = typeof sess.getStoragePath === 'function' ? (sess.getStoragePath() || '') : '';
        const generated = storagePath
            ? `persist:${path.basename(storagePath)}`
            : (isPersistent ? `persist:session_${++this.sessionCounter}` : `ephemeral_${++this.sessionCounter}`);
        this.sessionKeys.set(sess, generated);
        return generated;
    }

    getSessionInfo(sess) {
        if (!sess || typeof sess !== 'object') {
            return { isPersistent: true, sessionKey: 'default' };
        }
        const isPersistent = typeof sess.isPersistent === 'function' ? Boolean(sess.isPersistent()) : true;
        const sessionKey = this.registerSession(sess);
        return { isPersistent, sessionKey };
    }

    isPartitionEphemeral(partition) {
        if (!partition || typeof partition !== 'string') return false;
        const p = partition.trim().toLowerCase();
        return p === 'ghost' || p === 'tor' || (p !== '' && p !== 'default' && !p.startsWith('persist:'));
    }

    loadSync() {
        this.persistentStore = {};
        if (!this.filePath) return;

        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    this.persistentStore = this._sanitizePersistentStore(parsed);
                    return;
                }
            }
        } catch (err) {
            console.warn('[PermissionManager] Failed to load site-permissions.json:', err.message);
        }

        // One-time migration from legacy permissions.json if present
        if (this.legacyFilePath && this.legacyFilePath !== this.filePath) {
            try {
                if (fs.existsSync(this.legacyFilePath)) {
                    const legacyRaw = fs.readFileSync(this.legacyFilePath, 'utf8');
                    const legacyParsed = JSON.parse(legacyRaw);
                    if (legacyParsed && typeof legacyParsed === 'object' && !Array.isArray(legacyParsed)) {
                        this.persistentStore = this._sanitizePersistentStore(legacyParsed);
                        if (Object.keys(this.persistentStore).length > 0) {
                            this._saveAsync();
                        }
                    }
                }
            } catch (err) {
                console.warn('[PermissionManager] Legacy permissions.json migration warning:', err.message);
            }
        }
    }

    _sanitizePersistentStore(raw) {
        const clean = {};
        for (const [rawOrigin, rawRules] of Object.entries(raw || {})) {
            if (!rawRules || typeof rawRules !== 'object') continue;
            const origin = extractOrigin(rawOrigin);
            if (!origin) continue;

            for (const [rawKey, rawVal] of Object.entries(rawRules)) {
                if (rawVal !== 'allow' && rawVal !== 'block') continue;
                if (rawKey === 'media') {
                    if (!clean[origin]) clean[origin] = {};
                    if (!clean[origin].camera) clean[origin].camera = rawVal;
                    if (!clean[origin].microphone) clean[origin].microphone = rawVal;
                    continue;
                }
                const key = normalizeSinglePermissionKey(rawKey);
                if (!key) continue;
                if (!clean[origin]) clean[origin] = {};
                clean[origin][key] = rawVal;
            }
        }
        return clean;
    }

    _saveAsync() {
        if (!this.filePath) return Promise.resolve();
        const payload = JSON.stringify(this.persistentStore, null, 2);
        this._writeChain = this._writeChain.then(async () => {
            try {
                await fsPromises.mkdir(path.dirname(this.filePath), { recursive: true });
                await fsPromises.writeFile(this.filePath, payload, 'utf8');
            } catch (err) {
                console.warn('[PermissionManager] Failed to persist site-permissions.json:', err.message);
            }
        });
        return this._writeChain;
    }

    _setSessionDecision(sessionKey, origin, key, value) {
        if (!sessionKey || !origin || !key) return;
        if (value === 'ask' || !value) {
            const originMap = this.sessionDecisions.get(sessionKey)?.get(origin);
            if (originMap) {
                originMap.delete(key);
                if (originMap.size === 0) {
                    this.sessionDecisions.get(sessionKey).delete(origin);
                }
            }
            return;
        }
        if (value !== 'allow' && value !== 'block') return;
        if (!this.sessionDecisions.has(sessionKey)) {
            this.sessionDecisions.set(sessionKey, new Map());
        }
        const sessMap = this.sessionDecisions.get(sessionKey);
        if (!sessMap.has(origin)) {
            sessMap.set(origin, new Map());
        }
        sessMap.get(origin).set(key, value);
    }

    _getSessionDecision(sessionKey, origin, key) {
        if (!sessionKey || !origin || !key) return undefined;
        return this.sessionDecisions.get(sessionKey)?.get(origin)?.get(key);
    }

    _clearPersistentSessionOverrides(origin, key) {
        for (const [sessKey, sessMap] of this.sessionDecisions.entries()) {
            if (this.isPartitionEphemeral(sessKey)) continue;
            const originMap = sessMap.get(origin);
            if (originMap) {
                if (key) {
                    originMap.delete(key);
                } else {
                    originMap.clear();
                }
                if (originMap.size === 0) {
                    sessMap.delete(origin);
                }
            }
        }
    }

    getEffectiveDecision(originOrUrl, permKey, context = {}) {
        const origin = extractOrigin(originOrUrl);
        const key = normalizeSinglePermissionKey(permKey);
        if (!origin || !key) return 'ask';

        const isPersistent = context.isPersistent !== undefined
            ? Boolean(context.isPersistent)
            : !this.isPartitionEphemeral(context.sessionKey || context.partition);
        const sessionKey = context.sessionKey || context.partition || 'default';

        // Ephemeral sessions (Ghost / Tor) NEVER read persistent disk rules
        if (!isPersistent) {
            return this._getSessionDecision(sessionKey, origin, key) || 'ask';
        }

        // Persistent sessions: check session-level decision ("Allow once") first, then persistent store
        const sessionDecision = this._getSessionDecision(sessionKey, origin, key);
        if (sessionDecision === 'allow' || sessionDecision === 'block') {
            return sessionDecision;
        }

        const persisted = this.persistentStore[origin]?.[key];
        if (persisted === 'allow' || persisted === 'block') {
            return persisted;
        }
        return 'ask';
    }

    /**
     * Evaluate Electron `setPermissionCheckHandler`.
     */
    checkPermission(permission, requestingOrigin, details = {}, context = {}) {
        const norm = normalizePermissionCheck(permission, details);
        if (norm.action === 'allow') return true;
        if (norm.action === 'deny') return false;

        const origin = extractOrigin(requestingOrigin);
        if (!origin) return false;

        if (norm.matchMode === 'any') {
            return norm.keys.some(k => this.getEffectiveDecision(origin, k, context) === 'allow');
        }
        return norm.keys.every(k => this.getEffectiveDecision(origin, k, context) === 'allow');
    }

    /**
     * Evaluate Electron `setPermissionRequestHandler` before prompting.
     * Returns:
     *  - { status: 'allow' }
     *  - { status: 'deny' }
     *  - { status: 'prompt', origin, host, keys, promptType }
     */
    evaluateRequest(permission, requestingUrl, details = {}, context = {}) {
        const norm = normalizePermissionRequest(permission, details);
        if (norm.action === 'allow') return { status: 'allow' };
        if (norm.action === 'deny') return { status: 'deny' };

        const origin = extractOrigin(requestingUrl);
        if (!origin) return { status: 'deny' };

        const decisions = norm.keys.map(k => ({
            key: k,
            decision: this.getEffectiveDecision(origin, k, context)
        }));

        // If any requested permission is explicitly blocked, deny immediately
        if (decisions.some(d => d.decision === 'block')) {
            return { status: 'deny' };
        }

        // If all requested permissions are already allowed, allow immediately
        if (decisions.every(d => d.decision === 'allow')) {
            return { status: 'allow' };
        }

        // Prompt only for the ungranted keys (e.g. if mic is already allowed and site asks for camera+mic, prompt for camera)
        const promptKeys = decisions.filter(d => d.decision !== 'allow').map(d => d.key);
        const promptType = getPromptTypeForKeys(promptKeys, norm.promptType);

        return {
            status: 'prompt',
            origin,
            host: getDisplayHost(origin),
            keys: promptKeys,
            promptType
        };
    }

    /**
     * Apply a user decision from the popup ('allow' | 'allow-once' | 'block' | 'dismiss').
     * Returns boolean (granted).
     */
    applyPromptDecision({ origin, keys, decision, isPersistent, sessionKey }) {
        const cleanOrigin = extractOrigin(origin);
        const cleanKeys = Array.isArray(keys) ? keys.map(normalizeSinglePermissionKey).filter(Boolean) : [];
        if (!cleanOrigin || cleanKeys.length === 0) return false;

        if (decision === 'dismiss') {
            return false;
        }

        if (decision === 'allow-once') {
            for (const k of cleanKeys) {
                this._setSessionDecision(sessionKey, cleanOrigin, k, 'allow');
            }
            this._emitChange(cleanOrigin, sessionKey, !isPersistent);
            return true;
        }

        if (decision === 'allow' || decision === 'block') {
            if (!isPersistent) {
                // Ephemeral (Ghost / Tor): NEVER write to disk!
                for (const k of cleanKeys) {
                    this._setSessionDecision(sessionKey, cleanOrigin, k, decision);
                }
                this._emitChange(cleanOrigin, sessionKey, true);
                return decision === 'allow';
            }

            // Persistent session: write to site-permissions.json
            if (!this.persistentStore[cleanOrigin]) {
                this.persistentStore[cleanOrigin] = {};
            }
            for (const k of cleanKeys) {
                this.persistentStore[cleanOrigin][k] = decision;
                this._clearPersistentSessionOverrides(cleanOrigin, k);
            }
            this._saveAsync();
            this._emitChange(cleanOrigin, sessionKey, false);
            return decision === 'allow';
        }

        return false;
    }

    /**
     * Queue & deduplicate a live Electron permission request, with webContents
     * destruction/navigation cleanup and timeout safety.
     */
    enqueueLivePrompt({
        webContents,
        targetWin,
        origin,
        host,
        keys,
        promptType,
        isPersistent,
        sessionKey,
        callback,
        sendPrompt,
        sendDismiss
    }) {
        const winId = targetWin?.id || 0;
        const dedupeKey = `${winId}|${sessionKey}|${origin}|${promptType}`;
        const existingId = this.pendingByDedupeKey.get(dedupeKey);

        const callbackRecord = {
            callback,
            webContents,
            settled: false,
            cleanupWatcher: null
        };

        const attachWebContentsWatcher = (entry, record) => {
            const wc = record.webContents;
            if (!wc || typeof wc.on !== 'function' || (typeof wc.isDestroyed === 'function' && wc.isDestroyed())) {
                return;
            }
            const onCancelForWc = () => {
                this._cancelCallbackRecord(entry, record);
            };
            const onNavigate = (event, navUrl, isInPlace, isMainFrame) => {
                if (isInPlace || isMainFrame === false) return;
                const nextOrigin = extractOrigin(navUrl);
                if (nextOrigin && nextOrigin !== entry.origin) {
                    onCancelForWc();
                }
            };
            try {
                wc.on('destroyed', onCancelForWc);
                wc.on('render-process-gone', onCancelForWc);
                wc.on('did-start-navigation', onNavigate);
                record.cleanupWatcher = () => {
                    try {
                        if (typeof wc.isDestroyed !== 'function' || !wc.isDestroyed()) {
                            wc.removeListener('destroyed', onCancelForWc);
                            wc.removeListener('render-process-gone', onCancelForWc);
                            wc.removeListener('did-start-navigation', onNavigate);
                        }
                    } catch (_) {}
                };
            } catch (_) {}
        };

        if (existingId && this.pendingById.has(existingId)) {
            const existing = this.pendingById.get(existingId);
            existing.records.add(callbackRecord);
            attachWebContentsWatcher(existing, callbackRecord);
            return existingId;
        }

        const requestId = `perm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const entry = {
            requestId,
            dedupeKey,
            origin,
            host,
            keys,
            promptType,
            isPersistent,
            sessionKey,
            targetWin,
            records: new Set([callbackRecord]),
            sendDismiss,
            timer: null
        };

        attachWebContentsWatcher(entry, callbackRecord);

        entry.timer = setTimeout(() => {
            this.resolveLivePrompt(requestId, 'dismiss', { notifyDismiss: true });
        }, this.promptTimeoutMs);
        if (entry.timer && typeof entry.timer.unref === 'function') {
            entry.timer.unref();
        }

        this.pendingById.set(requestId, entry);
        this.pendingByDedupeKey.set(dedupeKey, requestId);

        try {
            sendPrompt({
                requestId,
                origin,
                host,
                permissionKey: promptType,
                permissionKeys: keys,
                isEphemeral: !isPersistent,
                partition: sessionKey
            });
        } catch (err) {
            console.warn('[PermissionManager] Failed to dispatch permission prompt to renderer:', err.message);
            this.resolveLivePrompt(requestId, 'dismiss', { notifyDismiss: false });
        }

        return requestId;
    }

    _cancelCallbackRecord(entry, record) {
        if (!record || record.settled) return;
        record.settled = true;
        if (record.cleanupWatcher) {
            record.cleanupWatcher();
            record.cleanupWatcher = null;
        }
        entry.records.delete(record);
        try {
            record.callback(false);
        } catch (_) {}

        if (entry.records.size === 0) {
            this._cleanupEntry(entry, true);
        }
    }

    _cleanupEntry(entry, notifyDismiss) {
        if (!entry) return;
        if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
        }
        this.pendingById.delete(entry.requestId);
        if (this.pendingByDedupeKey.get(entry.dedupeKey) === entry.requestId) {
            this.pendingByDedupeKey.delete(entry.dedupeKey);
        }
        if (notifyDismiss && typeof entry.sendDismiss === 'function') {
            try {
                entry.sendDismiss({ requestId: entry.requestId });
            } catch (_) {}
        }
    }

    async resolveLivePrompt(requestId, decision, options = {}) {
        const entry = this.pendingById.get(requestId);
        if (!entry) return false;

        this._cleanupEntry(entry, Boolean(options.notifyDismiss));

        let granted = this.applyPromptDecision({
            origin: entry.origin,
            keys: entry.keys,
            decision,
            isPersistent: entry.isPersistent,
            sessionKey: entry.sessionKey
        });

        if (granted && typeof options.beforeGrant === 'function') {
            try {
                const osAllowed = await options.beforeGrant(entry);
                if (osAllowed === false) granted = false;
            } catch (_) {}
        }

        for (const record of Array.from(entry.records)) {
            if (record.settled) continue;
            record.settled = true;
            if (record.cleanupWatcher) {
                record.cleanupWatcher();
                record.cleanupWatcher = null;
            }
            try {
                record.callback(granted);
            } catch (_) {}
        }
        entry.records.clear();
        return granted;
    }

    /**
     * Read permissions for a specific origin (used by SiteInfoPopover).
     */
    getSitePermissions(originOrDomain, options = {}) {
        const origin = extractOrigin(originOrDomain);
        if (!origin) return {};

        const partition = options?.partition || '';
        const isEphemeral = Boolean(options?.isEphemeral) || this.isPartitionEphemeral(partition);

        if (isEphemeral) {
            const sessionKey = partition || 'ghost';
            const originMap = this.sessionDecisions.get(sessionKey)?.get(origin);
            if (!originMap) return {};
            return Object.fromEntries(originMap.entries());
        }

        const persisted = { ...(this.persistentStore[origin] || {}) };
        // Overlay any active session-only ("Allow once") overrides for persistent sessions so SiteInfo reflects live truth
        const preferredSessionKey = partition || '';
        if (preferredSessionKey) {
            const sessOriginMap = this.sessionDecisions.get(preferredSessionKey)?.get(origin);
            if (sessOriginMap) {
                for (const [k, v] of sessOriginMap.entries()) {
                    if (!persisted[k]) {
                        persisted[k] = v;
                    }
                }
            }
        } else {
            for (const [sessKey, sessMap] of this.sessionDecisions.entries()) {
                if (this.isPartitionEphemeral(sessKey)) continue;
                const sessOriginMap = sessMap.get(origin);
                if (!sessOriginMap) continue;
                for (const [k, v] of sessOriginMap.entries()) {
                    if (!persisted[k]) {
                        persisted[k] = v;
                    }
                }
            }
        }
        return persisted;
    }

    /**
     * Update a permission for an origin (used by SiteInfoPopover & SettingsModal).
     */
    async setSitePermission(originOrDomain, permKey, value, options = {}) {
        const origin = extractOrigin(originOrDomain);
        if (!origin || !permKey) return false;
        const normalizedVal = VALID_DECISIONS.has(value) ? value : 'ask';

        const keysToUpdate = permKey === 'media'
            ? ['camera', 'microphone']
            : [normalizeSinglePermissionKey(permKey)].filter(Boolean);
        if (keysToUpdate.length === 0) return false;

        const partition = options?.partition || '';
        const isEphemeral = Boolean(options?.isEphemeral) || this.isPartitionEphemeral(partition);

        if (isEphemeral) {
            const sessionKey = partition || 'ghost';
            for (const k of keysToUpdate) {
                this._setSessionDecision(sessionKey, origin, k, normalizedVal);
                try { rustBridge.permissionSet(sessionKey, origin, k, normalizedVal); } catch (_) {}
            }
            this._emitChange(origin, sessionKey, true);
            return true;
        }

        if (normalizedVal === 'ask') {
            if (this.persistentStore[origin]) {
                for (const k of keysToUpdate) {
                    delete this.persistentStore[origin][k];
                    this._clearPersistentSessionOverrides(origin, k);
                    try { rustBridge.permissionSet(partition || 'default', origin, k, 'ask'); } catch (_) {}
                }
                if (Object.keys(this.persistentStore[origin]).length === 0) {
                    delete this.persistentStore[origin];
                }
            } else {
                for (const k of keysToUpdate) {
                    this._clearPersistentSessionOverrides(origin, k);
                    try { rustBridge.permissionSet(partition || 'default', origin, k, 'ask'); } catch (_) {}
                }
            }
        } else {
            if (!this.persistentStore[origin]) {
                this.persistentStore[origin] = {};
            }
            for (const k of keysToUpdate) {
                this.persistentStore[origin][k] = normalizedVal;
                this._clearPersistentSessionOverrides(origin, k);
                try { rustBridge.permissionSet(partition || 'default', origin, k, normalizedVal); } catch (_) {}
            }
        }

        await this._saveAsync();
        this._emitChange(origin, partition || 'default', false);
        return true;
    }

    /**
     * Read all persistent origin permission rules (used by SettingsModal).
     */
    getAllPersistentPermissions() {
        const snapshot = {};
        for (const [origin, rules] of Object.entries(this.persistentStore)) {
            if (rules && Object.keys(rules).length > 0) {
                snapshot[origin] = { ...rules };
            }
        }
        return snapshot;
    }

    /**
     * Reset all permissions for an origin.
     */
    async resetSitePermissions(originOrDomain, options = {}) {
        const origin = extractOrigin(originOrDomain);
        if (!origin) return false;

        const partition = options?.partition || '';
        const isEphemeral = Boolean(options?.isEphemeral) || this.isPartitionEphemeral(partition);

        if (isEphemeral) {
            const sessionKey = partition || 'ghost';
            this.sessionDecisions.get(sessionKey)?.delete(origin);
            this._emitChange(origin, sessionKey, true);
            return true;
        }

        delete this.persistentStore[origin];
        this._clearPersistentSessionOverrides(origin, null);
        await this._saveAsync();
        this._emitChange(origin, partition || 'default', false);
        return true;
    }

    /**
     * Clear all in-memory ephemeral decisions for a session/partition (e.g. Ghost or Tor reset).
     */
    clearSessionPermissions(partition) {
        if (!partition) return;
        this.sessionDecisions.delete(partition);
        this._emitChange('', partition, true);
    }

    _emitChange(origin, partition, isEphemeral) {
        if (this.onChange) {
            try {
                this.onChange({ origin, partition, isEphemeral });
            } catch (_) {}
        }
    }
}

module.exports = {
    PermissionManager,
    AUTO_ALLOW_PERMISSIONS,
    CHECK_AUTO_ALLOW_PERMISSIONS,
    extractOrigin,
    getDisplayHost,
    normalizeSinglePermissionKey,
    normalizePermissionRequest,
    normalizePermissionCheck,
    getPromptTypeForKeys
};
