import { create } from 'zustand';
import useUIStore from './useUIStore';
import useVaultStore from './useVaultStore';
import useTabStore, { isValidSyncTab, getCleanTabTitle } from './useTabStore';
import useHistoryStore from './useHistoryStore';
import { saveCustomPresetsToStorage, setSavedPresetId } from '../utils/experiencePresets';
import { auth, db } from '../services/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteField, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

export function isRawCiphertextString(str) {
    return typeof str === 'string' && /^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(str.trim());
}

// Proactively remove legacy plaintext pending cloud vault cache from localStorage
try {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('qbrowse_vault_cloud_pending');
    }
} catch (_) {}

export async function saveWrappedPassphrase(passphrase) {
    try {
        localStorage.removeItem('qbrowse_master_passphrase');
    } catch (_) {}
    if (!passphrase) {
        try {
            localStorage.removeItem('qbrowse_wrapped_mp');
        } catch (_) {}
        return;
    }
    try {
        if (window.electronAPI?.wrapSyncSecret) {
            const wrapped = await window.electronAPI.wrapSyncSecret(passphrase);
            if (wrapped) {
                localStorage.setItem('qbrowse_wrapped_mp', wrapped);
                return wrapped;
            }
        } else {
            const encoded = btoa(unescape(encodeURIComponent(passphrase)));
            localStorage.setItem('qbrowse_wrapped_mp', encoded);
            return encoded;
        }
    } catch (e) {
        console.warn('[Sync] saveWrappedPassphrase error:', e);
    }
}

export async function loadWrappedPassphrase() {
    try {
        const legacy = localStorage.getItem('qbrowse_master_passphrase');
        if (legacy) {
            await saveWrappedPassphrase(legacy);
            try { localStorage.removeItem('qbrowse_master_passphrase'); } catch (_) {}
            return legacy;
        }

        const wrapped = localStorage.getItem('qbrowse_wrapped_mp');
        if (!wrapped) return '';

        if (window.electronAPI?.unwrapSyncSecret) {
            const unwrapped = await window.electronAPI.unwrapSyncSecret(wrapped);
            return unwrapped || '';
        } else {
            try {
                return decodeURIComponent(escape(atob(wrapped)));
            } catch (_) {
                return '';
            }
        }
    } catch (e) {
        console.warn('[Sync] loadWrappedPassphrase error:', e);
        return '';
    }
}

function toUint8Array(val) {
    if (val instanceof Uint8Array) return val;
    if (Array.isArray(val)) return new Uint8Array(val);
    if (typeof val === 'string') {
        return new Uint8Array(val.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
    }
    return new Uint8Array();
}

function toHexString(val) {
    if (typeof val === 'string') return val;
    if (val instanceof Uint8Array || Array.isArray(val)) {
        return Array.from(val, b => Number(b).toString(16).padStart(2, '0')).join('');
    }
    return null;
}

// Web Crypto API Encryption Helpers (AES-GCM 256-bit with PBKDF2)
async function deriveKey(passphrase, saltInput) {
    const encoder = new TextEncoder();
    const passphraseKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    const salt = toUint8Array(saltInput);
    if (salt.length === 0) {
        throw new Error('Malformed encrypted payload structure');
    }
    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passphraseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

function generateSaltHex() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function encryptData(payloadObj, passphrase) {
    try {
        const jsonStr = JSON.stringify(payloadObj);
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(jsonStr);
        const saltHex = generateSaltHex();
        const key = await deriveKey(passphrase, saltHex);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBytes
        );
        return {
            salt: saltHex,
            iv: Array.from(iv, b => b.toString(16).padStart(2, '0')).join(''),
            cipher: Array.from(new Uint8Array(encryptedContent), b => b.toString(16).padStart(2, '0')).join('')
        };
    } catch(e) {
        console.error("[Encryption Error]", e);
        throw e;
    }
}

// Robust extractor for encrypted backup payloads across all schema variations and legacy versions
export function extractEncryptedPayload(candidate) {
    if (!candidate) return null;

    // 1. If candidate is a JSON string, attempt parsing
    if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
            try {
                const parsed = JSON.parse(trimmed);
                return extractEncryptedPayload(parsed);
            } catch (_) {}
        }
        return null;
    }

    if (typeof candidate !== 'object') return null;

    // 2. Direct encrypted object check: candidate has salt, iv, and cipher (or variations)
    const salt = candidate.salt || candidate.s;
    const iv = candidate.iv || candidate.initializationVector;
    const cipher = candidate.cipher || candidate.ciphertext || candidate.data || candidate.encryptedContent;
    if (salt && iv && cipher) {
        const saltStr = toHexString(salt);
        const ivStr = toHexString(iv);
        const cipherStr = toHexString(cipher);
        if (saltStr && ivStr && cipherStr) {
            return { salt: saltStr, iv: ivStr, cipher: cipherStr };
        }
    }

    // 3. Inspect nested candidate properties in order of common usage
    const candidateKeys = [
        'encrypted',
        'encryptedData',
        'encryptedPayload',
        'payload',
        'backupData',
        'data',
        'ciphertext',
        'cipher',
        'content',
        'backup',
        'blob'
    ];

    for (const key of candidateKeys) {
        if (candidate[key] && candidate[key] !== candidate) {
            const extracted = extractEncryptedPayload(candidate[key]);
            if (extracted) return extracted;
        }
    }

    return null;
}

// Lightweight IndexedDB helper for resilient offline backup cache
function openBackupDB() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            return reject(new Error("IndexedDB unavailable"));
        }
        const req = window.indexedDB.open('qbrowse_backups_db', 1);
        req.onupgradeneeded = (e) => {
            const idb = e.target.result;
            if (!idb.objectStoreNames.contains('backups')) {
                idb.createObjectStore('backups', { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB open error"));
    });
}

async function saveIndexedDBBackup(backupRecord) {
    if (!backupRecord || !backupRecord.id) return;
    try {
        const idb = await openBackupDB();
        const tx = idb.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        store.put(backupRecord);
        await new Promise((resolve) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch (_) {}
}

async function getIndexedDBBackup(targetId, targetCreatedAt) {
    try {
        const idb = await openBackupDB();
        const tx = idb.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        if (targetId) {
            const req = store.get(targetId);
            const res = await new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
            if (res) return res;
        }
        const allReq = store.getAll();
        const all = await new Promise((resolve) => {
            allReq.onsuccess = () => resolve(allReq.result || []);
            allReq.onerror = () => resolve([]);
        });
        return all.find(b => 
            (targetId && b.id === targetId) || 
            (targetCreatedAt && b.createdAt === targetCreatedAt)
        ) || null;
    } catch (_) {
        return null;
    }
}

async function getAllIndexedDBBackups() {
    try {
        const idb = await openBackupDB();
        const tx = idb.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        const allReq = store.getAll();
        return await new Promise((resolve) => {
            allReq.onsuccess = () => resolve(allReq.result || []);
            allReq.onerror = () => resolve([]);
        });
    } catch (_) {
        return [];
    }
}

async function deleteIndexedDBBackup(backupId) {
    if (!backupId) return;
    try {
        const idb = await openBackupDB();
        const tx = idb.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        store.delete(backupId);
        await new Promise((resolve) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch (_) {}
}

async function decryptData(encryptedObj, passphrase) {
    try {
        if (!encryptedObj || !passphrase) {
            throw new Error("Missing encrypted data or encryption passphrase");
        }

        let payload = encryptedObj;
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (_) {}
        }

        const normalized = extractEncryptedPayload(payload) || payload;
        const salt = normalized.salt || normalized.s;
        const iv = normalized.iv || normalized.initializationVector;
        const cipher = normalized.cipher || normalized.ciphertext || normalized.data || normalized.encryptedContent;

        if (!salt || !iv || !cipher) {
            throw new Error("Malformed encrypted payload structure");
        }

        const key = await deriveKey(passphrase, salt);

        const ivArray = toUint8Array(iv);
        const cipherArray = toUint8Array(cipher);

        if (ivArray.length === 0 || cipherArray.length === 0) {
            throw new Error("Invalid IV or Cipher length in backup data");
        }

        const decryptedBytes = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            key,
            cipherArray
        );
        const decoder = new TextDecoder();
        let decoded = JSON.parse(decoder.decode(decryptedBytes));
        if (typeof decoded === 'string') {
            try {
                decoded = JSON.parse(decoded);
            } catch (_) {}
        }
        return decoded;
    } catch(e) {
        console.warn("[Decryption Error] Passphrase mismatch or corrupted payload", e);
        if (e.message?.includes("Malformed") || e.message?.includes("Invalid IV")) {
            throw e;
        }
        throw new Error("Invalid Master Encryption Password or corrupted cloud data");
    }
}

function formatAuthError(error) {
    if (!error) return null;
    const code = error.code || '';
    const message = error.message || '';

    if (code === 'auth/configuration-not-found' || message.includes('configuration-not-found')) {
        return 'Email/Password Authentication is not enabled in Firebase Console. Please enable Email/Password under Firebase Console -> Authentication -> Sign-in method.';
    }
    if (code === 'auth/api-key-not-valid' || message.includes('api-key-not-valid') || message.includes('API key not valid')) {
        return 'Firebase API key is invalid or expired. Check your .env configuration.';
    }
    if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
        return 'Network connection error. Please check your internet connection.';
    }
    if (code === 'auth/email-already-in-use') {
        return 'An account with this email already exists. Try signing in instead.';
    }
    if (code === 'auth/weak-password') {
        return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
        return 'Please enter a valid email address.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return 'Invalid email or password combination.';
    }
    return message.replace(/^Firebase:\s*/, '');
}

// Self-healing migration to keep Firestore root document safe and strictly below 1MB.
// Only runs if the root document is genuinely approaching the limit (> 700KB).
// Safely preserves full backups and verifies subcollection capability before pruning.
async function healBloatedRootDocument(userId) {
    if (!userId) return;
    try {
        const rootRef = doc(db, 'users', userId);
        const userSnap = await getDoc(rootRef);
        if (!userSnap.exists()) return;

        const data = userSnap.data();
        const approxDocBytes = JSON.stringify(data).length;

        // If the document is safely below 700KB (Firestore limit is 1MB), root document is completely healthy
        if (approxDocBytes < 700000) return;

        console.log(`[Sync] Heavy root document detected (~${Math.round(approxDocBytes / 1024)}KB). Running safe backup pruning...`);

        // Cache all local backups to IndexedDB and localStorage before modifying anything
        if (Array.isArray(data.manual_backups)) {
            for (const b of data.manual_backups) {
                if (b && b.id) {
                    const enc = extractEncryptedPayload(b);
                    if (enc) {
                        saveIndexedDBBackup({ ...b, encrypted: enc }).catch(() => {});
                    }
                }
            }
        }

        // Test if subcollection write is permitted
        let canWriteSubcollection = false;
        try {
            const probeId = '_probe_' + Date.now();
            await setDoc(doc(db, 'users', userId, 'backups', probeId), { probe: true });
            await deleteDoc(doc(db, 'users', userId, 'backups', probeId));
            canWriteSubcollection = true;
        } catch (_) {
            canWriteSubcollection = false;
        }

        // If subcollection write works, copy all backups there
        if (canWriteSubcollection && Array.isArray(data.manual_backups)) {
            for (const b of data.manual_backups) {
                const enc = extractEncryptedPayload(b);
                if (b && b.id && enc) {
                    try {
                        await setDoc(doc(db, 'users', userId, 'backups', b.id), { ...b, encrypted: enc });
                    } catch(subErr) {
                        console.warn("[Sync] Backup migration subcollection notice:", subErr);
                    }
                }
            }
        }

        // Clean metadata for root doc: ALWAYS preserve the newest backup with its full encrypted payload!
        // Only strip encrypted payload from older backups (idx >= 1) if subcollection is working or size is critical
        const cleanedBackups = Array.isArray(data.manual_backups)
            ? data.manual_backups.map((b, idx) => {
                const enc = extractEncryptedPayload(b);
                if (idx === 0 && enc) {
                    return { ...b, encrypted: enc };
                }
                if (!canWriteSubcollection && enc && idx < 2) {
                    return { ...b, encrypted: enc };
                }
                return {
                    id: b.id,
                    label: b.label || 'Manual Backup',
                    createdAt: b.createdAt || new Date().toISOString(),
                    stats: b.stats || {}
                };
            }).slice(0, 5)
            : [];

        try {
            await setDoc(rootRef, { manual_backups: cleanedBackups }, { merge: true });
        } catch(e) {}

        console.log("[Sync] Root document safe pruning completed successfully.");
    } catch(err) {
        console.warn("[Sync] healBloatedRootDocument notice:", err);
    }
}

// Persistent Device Identification for Cross-Device Tabs Sync
export function getOrCreateDeviceId() {
    let id = '';
    try {
        id = localStorage.getItem('qbrowse_device_id');
        if (!id) {
            id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
                ? crypto.randomUUID() 
                : `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('qbrowse_device_id', id);
        }
    } catch (_) {
        id = `dev-${Date.now()}`;
    }
    return id;
}

export function getDeviceName() {
    try {
        const customName = localStorage.getItem('qbrowse_custom_device_name');
        if (customName && customName.trim()) return customName.trim();
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        if (ua.includes('Windows')) return 'Windows PC';
        if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'Mac';
        if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux PC';
        if (ua.includes('Android')) return 'Android Device';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Device';
        return 'Browser Client';
    } catch (_) {
        return 'Browser Client';
    }
}

// Aggregates remote devices from Firestore snapshot while strictly ignoring the current device
async function parseRemoteDevicesFromSnapshot(data, masterPassword, currentDeviceId) {
    if (!data || !masterPassword) return [];
    const rawDeviceMap = { ...(data.devices || {}), ...(data.deviceTabs || {}) };
    const remoteList = [];

    for (const [dId, devData] of Object.entries(rawDeviceMap)) {
        if (!devData) continue;
        // Strictly ignore tabs from current device to prevent startup race & self-echo
        if (dId === currentDeviceId || devData.deviceId === currentDeviceId) {
            continue;
        }

        let dec = null;
        if (devData.encrypted) {
            try {
                dec = await decryptData(devData.encrypted, masterPassword);
            } catch (e) {
                console.warn('[Sync] Could not decrypt device tabs for:', dId, e);
            }
        } else if (Array.isArray(devData.tabs)) {
            dec = devData;
        }

        if (dec) {
            let tabs = Array.isArray(dec.tabs) ? dec.tabs.filter(isValidSyncTab) : [];
            if (tabs.length === 0) {
                const p = (dec.privateTabs || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: 'personal', spaceName: 'Personal' }));
                const w = (dec.workTabs || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: 'work', spaceName: 'Work' }));
                const c = [];
                if (dec.customSpaceTabs && typeof dec.customSpaceTabs === 'object') {
                    Object.entries(dec.customSpaceTabs).forEach(([sId, list]) => {
                        (list || []).filter(isValidSyncTab).forEach(t => c.push({ ...t, spaceId: sId, spaceName: sId }));
                    });
                }
                tabs = [...p, ...w, ...c];
            }

            remoteList.push({
                deviceId: dId,
                deviceName: dec.deviceName || devData.deviceName || 'Remote Device',
                lastSynced: dec.lastSynced || devData.lastSynced || (devData.updatedAt ? new Date(devData.updatedAt).getTime() : Date.now()),
                tabs
            });
        }
    }

    // Fallback: If no structured device tabs yet, check legacy data.tabs.encrypted
    // Ensure we do NOT echo back if it was written by this same device!
    if (remoteList.length === 0 && data.tabs?.encrypted && data.lastSyncDeviceId !== currentDeviceId) {
        try {
            const dec = await decryptData(data.tabs.encrypted, masterPassword);
            if (dec) {
                const p = (dec.privateTabs || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: 'personal', spaceName: 'Personal' }));
                const w = (dec.workTabs || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: 'work', spaceName: 'Work' }));
                const c = [];
                if (dec.customSpaceTabs && typeof dec.customSpaceTabs === 'object') {
                    Object.entries(dec.customSpaceTabs).forEach(([sId, list]) => {
                        (list || []).filter(isValidSyncTab).forEach(t => c.push({ ...t, spaceId: sId, spaceName: sId }));
                    });
                }
                const tabs = [...p, ...w, ...c];
                if (tabs.length > 0) {
                    remoteList.push({
                        deviceId: 'legacy-remote',
                        deviceName: data.userAgent?.includes('Mac') ? 'Mac' : data.userAgent?.includes('Windows') ? 'Windows PC' : 'Remote Client',
                        lastSynced: data.tabs.updatedAt ? new Date(data.tabs.updatedAt).getTime() : Date.now(),
                        tabs
                    });
                }
            }
        } catch (_) {}
    }

    return remoteList;
}

// Global active snapshot listener unsubscribers
let unsubscribeCloudListeners = [];
let isApplyingCloudUpdate = false;
let isApplyingRemoteSync = false;
let remoteApplyDepth = 0;
let remoteApplyResetTimer = null;
let autoSyncIntervalTimer = null;
let debounceSyncTimer = null;
let storeUnsubscribers = [];
let watchersArmed = false;
let watcherArmTimer = null;
let hasSyncedThisSession = false;
let sessionSyncedUid = '';
let hasAppliedInitialCloudSnapshot = false;
let localSettingsDirty = false;
let localTabsDirty = false;
let localPresetsDirty = false;
let lastAutoSyncExecutedAt = 0;
let lastLocalWriteIso = '';
let vaultUnlockSyncInFlight = null;
let vaultMergeChain = Promise.resolve();
const MIN_AUTO_SYNC_COOLDOWN_MS = 30000; // Minimum 30s between automatic silent syncs

const SETTINGS_UPDATED_AT_KEY = 'qbrowse_settings_updated_at';
const TABS_UPDATED_AT_KEY = 'qbrowse_tabs_updated_at';
const PRESETS_UPDATED_AT_KEY = 'qbrowse_presets_updated_at';
const VAULT_DELETED_IDS_KEY = 'qbrowse_vault_deleted_ids';
const PRESETS_DELETED_IDS_KEY = 'qbrowse_deleted_preset_ids';

// Cached payload signatures to prevent re-encrypting & re-uploading unchanged categories
let lastSyncedSignatures = {
    settings: '',
    vault: '',
    tabs: '',
    pinnedTabs: '',
    history: '',
    presets: ''
};

let lastObservedTabSig = '';
let lastObservedSharedTabsMetaSig = '';
let lastObservedVaultSig = '';
let lastObservedVaultMap = new Map();
let lastObservedVaultUnlocked = false;
let lastObservedSettingsSig = '';
let lastObservedPresetsSig = '';
let lastObservedPresetIds = new Set();

function parseTimestampMs(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? value : 0;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        if (/^\d+(\.\d+)?$/.test(trimmed)) {
            const num = Number(trimmed);
            return Number.isFinite(num) && num > 0 ? num : 0;
        }
        const parsed = Date.parse(trimmed);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return 0;
}

function getEffectiveCustomSpaces(uiState, tabState) {
    const settingsSpaces = uiState?.settings?.customSpaces;
    if (Array.isArray(settingsSpaces) && settingsSpaces.length > 0) return settingsSpaces;
    const topSpaces = uiState?.customSpaces;
    if (Array.isArray(topSpaces) && topSpaces.length > 0) return topSpaces;
    const tabSpaces = tabState?.customSpaces;
    if (Array.isArray(tabSpaces) && tabSpaces.length > 0) return tabSpaces;
    return Array.isArray(settingsSpaces)
        ? settingsSpaces
        : Array.isArray(topSpaces)
            ? topSpaces
            : Array.isArray(tabSpaces)
                ? tabSpaces
                : [];
}

function getEffectiveSpaceOrder(uiState, tabState) {
    if (Array.isArray(uiState?.spaceOrder) && uiState.spaceOrder.length > 0) return uiState.spaceOrder;
    if (Array.isArray(uiState?.settings?.spaceOrder) && uiState.settings.spaceOrder.length > 0) return uiState.settings.spaceOrder;
    if (Array.isArray(tabState?.spaceOrder) && tabState.spaceOrder.length > 0) return tabState.spaceOrder;
    return Array.isArray(uiState?.spaceOrder)
        ? uiState.spaceOrder
        : Array.isArray(tabState?.spaceOrder)
            ? tabState.spaceOrder
            : [];
}

function computeTabsWatcherSignature(tabState) {
    if (!tabState) return '';
    const formatSigTab = (t) => `${t.id}|${t.url || ''}|${getCleanTabTitle(t)}`;
    const priv = (tabState.privateTabs || []).filter(isValidSyncTab).map(formatSigTab).join(';');
    const work = (tabState.workTabs || []).filter(isValidSyncTab).map(formatSigTab).join(';');
    const customEntries = Object.entries(tabState.customSpaceTabs || {})
        .map(([sId, list]) => `${sId}:${(list || []).filter(isValidSyncTab).map(formatSigTab).join(',')}`)
        .join('|');
    const uiState = useUIStore.getState();
    const pins = (tabState.pinnedTabs || []).map(p => `${p.id}|${p.domain || ''}|${p.url || ''}|${p.title || ''}`).join(';');
    const spaces = JSON.stringify(getEffectiveCustomSpaces(uiState, tabState));
    const spaceOrder = JSON.stringify(getEffectiveSpaceOrder(uiState, tabState));
    return `${priv}::${work}::${customEntries}::${pins}::${spaces}::${spaceOrder}`;
}

function computeSharedTabsMetaSignature(uiState, tabState) {
    const pins = ((tabState && tabState.pinnedTabs) || []).map(p => `${p.id}|${p.domain || ''}|${p.url || ''}|${p.title || ''}`).join(';');
    const spaces = JSON.stringify(getEffectiveCustomSpaces(uiState, tabState));
    const spaceOrder = JSON.stringify(getEffectiveSpaceOrder(uiState, tabState));
    return `${pins}::${spaces}::${spaceOrder}`;
}

function computeVaultWatcherSignature(vaultState) {
    if (!vaultState || !Array.isArray(vaultState.passwords)) return '';
    return vaultState.passwords
        .map(p => `${p.id}|${p.updatedAt || ''}|${p.url || ''}|${p.username || ''}|${p.password || ''}`)
        .join(';');
}

function computeSettingsWatcherSignature(uiState) {
    if (!uiState) return '';
    const s = { ...(uiState.settings || {}) };
    delete s.syncedCloudSettings;
    if (s.customWallpaperSource !== 'url') {
        delete s.customWallpaper;
        delete s.customWallpaperOriginalUrl;
    }
    return JSON.stringify({
        s,
        theme: uiState.theme || 'dark',
        accentColor: uiState.accentColor || '#d4bc94'
    });
}

function computePresetsWatcherSignature(uiState) {
    if (!uiState) return '';
    return JSON.stringify({
        activePresetId: uiState.activePresetId || uiState.activePreset || 'default',
        customPresets: uiState.customPresets || [],
        presetOverrides: uiState.presetOverrides || {}
    });
}

function getVaultStableKey(item) {
    if (!item || typeof item !== 'object') return '';
    const norm = (s) => (s ? String(s).trim().toLowerCase() : '');
    const title = norm(item.title?.split('|||')[0]);
    const url = norm(item.url);
    const user = norm(item.username);
    if (!url && !title) return '';
    return `${url}|${title}|${user}`;
}

function buildLocalVaultSnapshotMap(passwords) {
    const map = new Map();
    if (!Array.isArray(passwords)) return map;
    passwords.forEach(item => {
        if (!item || item.id === undefined || item.id === null) return;
        map.set(String(item.id), {
            id: String(item.id),
            updatedAtMs: parseTimestampMs(item.updatedAt || item.createdAt),
            stableKey: getVaultStableKey(item)
        });
    });
    return map;
}

function normalizeVaultTombstones(input) {
    const deletedIds = {};
    const deletedKeys = {};
    if (!input) return { deletedIds, deletedKeys };
    const addEntry = (targetMap, k, ts) => {
        if (!k) return;
        const key = String(k);
        const ms = parseTimestampMs(ts) || Date.now();
        if (!targetMap[key] || ms > targetMap[key]) {
            targetMap[key] = ms;
        }
    };
    if (Array.isArray(input)) {
        input.forEach(entry => {
            if (typeof entry === 'string' || typeof entry === 'number') {
                addEntry(deletedIds, entry, Date.now());
            } else if (entry && typeof entry === 'object') {
                addEntry(deletedIds, entry.id, entry.deletedAt || entry.updatedAt);
                if (entry.stableKey) addEntry(deletedKeys, entry.stableKey, entry.deletedAt || entry.updatedAt);
            }
        });
        return { deletedIds, deletedKeys };
    }
    if (typeof input === 'object') {
        if (input.deletedIds && typeof input.deletedIds === 'object') {
            Object.entries(input.deletedIds).forEach(([k, v]) => addEntry(deletedIds, k, v));
        }
        if (input.deletedKeys && typeof input.deletedKeys === 'object') {
            Object.entries(input.deletedKeys).forEach(([k, v]) => addEntry(deletedKeys, k, v));
        }
        if (!input.deletedIds && !input.deletedKeys) {
            Object.entries(input).forEach(([k, v]) => {
                if (typeof v === 'number' || typeof v === 'string') {
                    addEntry(deletedIds, k, v);
                } else if (v && typeof v === 'object') {
                    addEntry(deletedIds, k, v.deletedAt || v.updatedAt);
                    if (v.stableKey) addEntry(deletedKeys, v.stableKey, v.deletedAt || v.updatedAt);
                }
            });
        }
    }
    return { deletedIds, deletedKeys };
}

function pruneTombstoneObject(obj, maxEntries = 500) {
    const entries = Object.entries(obj || {});
    if (entries.length <= maxEntries) return { ...(obj || {}) };
    entries.sort((a, b) => parseTimestampMs(b[1]) - parseTimestampMs(a[1]));
    return Object.fromEntries(entries.slice(0, maxEntries));
}

function mergeVaultTombstones(a, b) {
    const normA = normalizeVaultTombstones(a);
    const normB = normalizeVaultTombstones(b);
    const mergedIds = { ...normA.deletedIds };
    const mergedKeys = { ...normA.deletedKeys };
    Object.entries(normB.deletedIds).forEach(([k, ts]) => {
        if (!mergedIds[k] || ts > mergedIds[k]) mergedIds[k] = ts;
    });
    Object.entries(normB.deletedKeys).forEach(([k, ts]) => {
        if (!mergedKeys[k] || ts > mergedKeys[k]) mergedKeys[k] = ts;
    });
    return {
        deletedIds: pruneTombstoneObject(mergedIds),
        deletedKeys: pruneTombstoneObject(mergedKeys)
    };
}

function getLocalVaultTombstones() {
    try {
        const raw = localStorage.getItem(VAULT_DELETED_IDS_KEY);
        return raw ? normalizeVaultTombstones(JSON.parse(raw)) : { deletedIds: {}, deletedKeys: {} };
    } catch (_) {
        return { deletedIds: {}, deletedKeys: {} };
    }
}

function saveLocalVaultTombstones(tombstones) {
    try {
        const norm = mergeVaultTombstones(tombstones, null);
        localStorage.setItem(VAULT_DELETED_IDS_KEY, JSON.stringify(norm));
        return norm;
    } catch (_) {
        return { deletedIds: {}, deletedKeys: {} };
    }
}

function recordLocalVaultDeletions(deletedEntries, currentPasswords = []) {
    if (!Array.isArray(deletedEntries) || deletedEntries.length === 0) return;
    const tombstones = getLocalVaultTombstones();
    const now = Date.now();
    deletedEntries.forEach(entry => {
        if (!entry) return;
        const id = typeof entry === 'object' ? String(entry.id || '') : String(entry);
        const key = typeof entry === 'object' ? (entry.stableKey || getVaultStableKey(entry)) : '';
        if (id) tombstones.deletedIds[id] = now;
        if (key) tombstones.deletedKeys[key] = now;
    });
    (currentPasswords || []).forEach(p => {
        if (!p) return;
        const idStr = p.id !== undefined && p.id !== null ? String(p.id) : '';
        const key = getVaultStableKey(p);
        if (idStr) delete tombstones.deletedIds[idStr];
        if (key) delete tombstones.deletedKeys[key];
    });
    saveLocalVaultTombstones(tombstones);
}

function getLocalDeletedPresetIds() {
    try {
        const raw = localStorage.getItem(PRESETS_DELETED_IDS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const out = {};
            parsed.forEach(id => {
                if (id) out[String(id)] = 1;
            });
            return out;
        }
        if (parsed && typeof parsed === 'object') {
            const out = {};
            Object.entries(parsed).forEach(([k, v]) => {
                const ms = parseTimestampMs(v);
                out[String(k)] = ms || 1;
            });
            return out;
        }
    } catch (_) {}
    return {};
}

function saveLocalDeletedPresetIds(map) {
    try {
        localStorage.setItem(PRESETS_DELETED_IDS_KEY, JSON.stringify(pruneTombstoneObject(map)));
    } catch (_) {}
}

function mergeIdTombstones(localMap, remoteInput) {
    const out = { ...(localMap || {}) };
    if (Array.isArray(remoteInput)) {
        remoteInput.forEach(entry => {
            if (typeof entry === 'string' || typeof entry === 'number') {
                const id = String(entry);
                if (!out[id]) out[id] = Date.now();
            } else if (entry && entry.id) {
                const id = String(entry.id);
                const ms = parseTimestampMs(entry.deletedAt || entry.updatedAt) || Date.now();
                if (!out[id] || ms > out[id]) out[id] = ms;
            }
        });
    } else if (remoteInput && typeof remoteInput === 'object') {
        Object.entries(remoteInput).forEach(([k, v]) => {
            const ms = parseTimestampMs(v) || 1;
            if (!out[k] || ms > out[k]) out[k] = ms;
        });
    }
    return pruneTombstoneObject(out);
}

function normalizeRemoteHistoryItems(items) {
    if (!Array.isArray(items)) return [];
    const out = [];
    for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const url = item.url || '';
        if (!url && !item.id) continue;
        const lastVisit = Math.max(
            parseTimestampMs(item.lastVisit),
            parseTimestampMs(item.timestamp),
            parseTimestampMs(item.visitedAt)
        ) || Date.now();
        const visits = Math.max(
            Number(item.visits) || 0,
            Number(item.visitCount) || 0,
            1
        );
        out.push({
            ...item,
            id: item.id || `${url}_${lastVisit}`,
            url,
            title: item.title || url || 'Untitled',
            lastVisit,
            visits
        });
    }
    return out;
}

function mergeHistoryLists(localList, remoteList, limit = 200) {
    const byKey = new Map();
    const ingest = (list) => {
        for (const item of normalizeRemoteHistoryItems(list)) {
            const key = item.url ? item.url.trim() : String(item.id);
            const existing = byKey.get(key);
            if (!existing) {
                byKey.set(key, item);
            } else {
                const newestTs = Math.max(existing.lastVisit || 0, item.lastVisit || 0);
                const maxVisits = Math.max(existing.visits || 1, item.visits || 1);
                const preferIncoming = (item.lastVisit || 0) >= (existing.lastVisit || 0);
                byKey.set(key, {
                    ...(preferIncoming ? existing : item),
                    ...(preferIncoming ? item : existing),
                    id: existing.id || item.id,
                    url: existing.url || item.url,
                    title: (preferIncoming ? item.title : existing.title) || existing.title || item.title || existing.url,
                    lastVisit: newestTs,
                    visits: maxVisits
                });
            }
        }
    };
    ingest(localList);
    ingest(remoteList);
    return Array.from(byKey.values())
        .sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0))
        .slice(0, limit);
}

function mergePresetsAndOverrides({
    localCustomPresets = [],
    remoteCustomPresets = [],
    localOverrides = {},
    remoteOverrides = {},
    localActivePresetId = 'default',
    remoteActivePresetId = '',
    remoteDeletedPresetIds = null,
    remotePresetsUpdatedAtMs = 0,
    localPresetsUpdatedAtMs = 0,
    localPresetsDirty = false
}) {
    const localTombstones = getLocalDeletedPresetIds();
    const mergedDeleted = mergeIdTombstones(localTombstones, remoteDeletedPresetIds);

    // Clear tombstones if either side has a preset updated strictly after its deletion
    const byId = new Map();
    const ingestPreset = (preset, sourceUpdatedAtMs, isRemote) => {
        if (!preset || typeof preset !== 'object' || !preset.id) return;
        const id = String(preset.id);
        const itemTs = parseTimestampMs(preset.updatedAt || preset.createdAt) || sourceUpdatedAtMs || 0;
        const deletedAt = mergedDeleted[id] || 0;
        if (deletedAt > 0 && deletedAt >= itemTs && itemTs > 0) return;
        if (deletedAt > 0 && itemTs === 0 && deletedAt >= 1 && isRemote && deletedAt > sourceUpdatedAtMs) return;
        if (deletedAt > 0 && itemTs === 0 && !isRemote) {
            // Live local preset clears stale local tombstone unless remote deleted more recently
            if (deletedAt > localPresetsUpdatedAtMs) return;
        }
        if (deletedAt > 0 && itemTs > deletedAt) {
            delete mergedDeleted[id];
        }

        const existing = byId.get(id);
        if (!existing) {
            byId.set(id, { preset, ts: itemTs, isRemote });
        } else if (itemTs > existing.ts || (itemTs === existing.ts && isRemote && remotePresetsUpdatedAtMs >= localPresetsUpdatedAtMs)) {
            byId.set(id, { preset, ts: itemTs, isRemote });
        }
    };

    (Array.isArray(localCustomPresets) ? localCustomPresets : []).forEach(p =>
        ingestPreset(p, localPresetsUpdatedAtMs, false)
    );
    (Array.isArray(remoteCustomPresets) ? remoteCustomPresets : []).forEach(p =>
        ingestPreset(p, remotePresetsUpdatedAtMs, true)
    );

    const mergedCustomPresets = [];
    for (const [id, entry] of byId.entries()) {
        const deletedAt = mergedDeleted[id] || 0;
        if (deletedAt > 0 && (entry.ts === 0 || deletedAt >= entry.ts)) continue;
        mergedCustomPresets.push(entry.preset);
    }

    const preferRemoteOverrides = remotePresetsUpdatedAtMs > localPresetsUpdatedAtMs || (!localPresetsDirty && localPresetsUpdatedAtMs === 0);
    const mergedOverrides = preferRemoteOverrides
        ? { ...(localOverrides || {}), ...(remoteOverrides || {}) }
        : { ...(remoteOverrides || {}), ...(localOverrides || {}) };

    let nextActivePresetId = localActivePresetId || 'default';
    if (
        remoteActivePresetId &&
        !mergedDeleted[String(remoteActivePresetId)] &&
        (remotePresetsUpdatedAtMs > localPresetsUpdatedAtMs || (!localPresetsDirty && localPresetsUpdatedAtMs === 0))
    ) {
        nextActivePresetId = remoteActivePresetId;
    }

    saveLocalDeletedPresetIds(mergedDeleted);
    return {
        customPresets: mergedCustomPresets,
        presetOverrides: mergedOverrides,
        activePresetId: nextActivePresetId,
        deletedPresetIds: mergedDeleted
    };
}

function refreshObservedWatcherSignatures() {
    try {
        const tabState = useTabStore.getState();
        const vaultState = useVaultStore.getState();
        const uiState = useUIStore.getState();
        lastObservedTabSig = computeTabsWatcherSignature(tabState);
        lastObservedSharedTabsMetaSig = computeSharedTabsMetaSignature(uiState, tabState);
        lastObservedVaultSig = computeVaultWatcherSignature(vaultState);
        lastObservedVaultUnlocked = Boolean(vaultState?.isUnlocked);
        if (lastObservedVaultUnlocked) {
            lastObservedVaultMap = buildLocalVaultSnapshotMap(vaultState?.passwords);
        }
        lastObservedSettingsSig = computeSettingsWatcherSignature(uiState);
        lastObservedPresetsSig = computePresetsWatcherSignature(uiState);
        lastObservedPresetIds = new Set((uiState?.customPresets || []).map(p => p && String(p.id)).filter(Boolean));
    } catch (_) {}
}

function beginRemoteApply() {
    if (remoteApplyResetTimer) {
        clearTimeout(remoteApplyResetTimer);
        remoteApplyResetTimer = null;
    }
    remoteApplyDepth += 1;
    isApplyingCloudUpdate = true;
    isApplyingRemoteSync = true;
}

function finalizeRemoteApplyState() {
    refreshObservedWatcherSignatures();
    isApplyingCloudUpdate = false;
    isApplyingRemoteSync = false;
}

function endRemoteApply(delayMs = 0) {
    remoteApplyDepth = Math.max(0, remoteApplyDepth - 1);
    if (remoteApplyDepth > 0) return;
    if (remoteApplyResetTimer) {
        clearTimeout(remoteApplyResetTimer);
        remoteApplyResetTimer = null;
    }
    refreshObservedWatcherSignatures();
    if (delayMs > 0) {
        remoteApplyResetTimer = setTimeout(() => {
            remoteApplyResetTimer = null;
            if (remoteApplyDepth === 0) {
                finalizeRemoteApplyState();
            }
        }, delayMs);
    } else {
        finalizeRemoteApplyState();
    }
}

function restoreTimestampKey(storageKey, prevValue, remoteMs, { adoptRemote = false } = {}) {
    try {
        if (adoptRemote && remoteMs > 0) {
            localStorage.setItem(storageKey, String(remoteMs));
        } else if (prevValue !== null && prevValue !== undefined && prevValue !== '') {
            localStorage.setItem(storageKey, prevValue);
        } else {
            localStorage.removeItem(storageKey);
        }
    } catch (_) {}
}

function applyRemoteSettingsToUIStore(decryptedSettings, remoteUpdatedAtMs = 0) {
    if (!decryptedSettings || typeof decryptedSettings !== 'object') return;
    const prevSettingsTs = (() => {
        try { return localStorage.getItem(SETTINGS_UPDATED_AT_KEY); } catch (_) { return null; }
    })();
    beginRemoteApply();
    try {
        const uiStore = useUIStore.getState();
        const currentSettings = uiStore.settings || {};
        Object.keys(decryptedSettings).forEach(key => {
            if (key.startsWith('_sync')) return;
            if (key === 'customSpaces' && (!Array.isArray(decryptedSettings[key]) || decryptedSettings[key].length === 0)) {
                return;
            }
            if (key !== 'syncedCloudSettings' && decryptedSettings[key] !== undefined && currentSettings[key] !== decryptedSettings[key]) {
                if (key === 'customWallpaper' && decryptedSettings.customWallpaper && decryptedSettings.customWallpaperSource === 'url') {
                    if (window.electronAPI && window.electronAPI.importWallpaperUrl) {
                        window.electronAPI.importWallpaperUrl(decryptedSettings.customWallpaper).then(res => {
                            if (res && res.success) {
                                const prevTs = localStorage.getItem(SETTINGS_UPDATED_AT_KEY);
                                beginRemoteApply();
                                try {
                                    useUIStore.getState().setCustomWallpaper(res.url, 'url', decryptedSettings.customWallpaper);
                                } finally {
                                    restoreTimestampKey(SETTINGS_UPDATED_AT_KEY, prevTs, remoteUpdatedAtMs, { adoptRemote: remoteUpdatedAtMs > 0 });
                                    endRemoteApply(0);
                                }
                            }
                        }).catch(() => {});
                    }
                } else if (typeof uiStore.setSettingValue === 'function') {
                    uiStore.setSettingValue(key, decryptedSettings[key]);
                }
            }
        });
        if (Array.isArray(decryptedSettings.customSpaces) && decryptedSettings.customSpaces.length > 0) {
            useUIStore.setState(state => ({
                customSpaces: decryptedSettings.customSpaces,
                settings: {
                    ...(state.settings || {}),
                    customSpaces: decryptedSettings.customSpaces
                }
            }));
        }
        if (decryptedSettings._syncTheme && decryptedSettings._syncTheme !== uiStore.theme && typeof uiStore.setTheme === 'function') {
            try {
                uiStore.setTheme(decryptedSettings._syncTheme);
            } catch (_) {}
        }
        if (decryptedSettings._syncAccentColor && decryptedSettings._syncAccentColor !== uiStore.accentColor && typeof uiStore.setAccentColor === 'function') {
            try {
                uiStore.setAccentColor(decryptedSettings._syncAccentColor);
            } catch (_) {}
        }
    } finally {
        restoreTimestampKey(SETTINGS_UPDATED_AT_KEY, prevSettingsTs, remoteUpdatedAtMs, { adoptRemote: remoteUpdatedAtMs > 0 });
        endRemoteApply(0);
    }
}

function applyRemotePresetsToUIStore(mergedPresets, remotePresetsUpdatedAtMs = 0, { adoptRemoteTimestamp = false } = {}) {
    if (!mergedPresets) return;
    const prevPresetsTs = (() => {
        try { return localStorage.getItem(PRESETS_UPDATED_AT_KEY); } catch (_) { return null; }
    })();
    const prevSettingsTs = (() => {
        try { return localStorage.getItem(SETTINGS_UPDATED_AT_KEY); } catch (_) { return null; }
    })();
    beginRemoteApply();
    try {
        if (Array.isArray(mergedPresets.customPresets)) {
            try {
                saveCustomPresetsToStorage(mergedPresets.customPresets);
                useUIStore.setState({ customPresets: mergedPresets.customPresets });
            } catch (_) {}
        }
        if (mergedPresets.presetOverrides && typeof mergedPresets.presetOverrides === 'object') {
            try {
                localStorage.setItem('qbrowse_preset_overrides', JSON.stringify(mergedPresets.presetOverrides));
                useUIStore.setState({ presetOverrides: mergedPresets.presetOverrides });
            } catch (_) {}
        }
        const uiStore = useUIStore.getState();
        if (mergedPresets.activePresetId && mergedPresets.activePresetId !== uiStore.activePresetId) {
            try {
                setSavedPresetId(mergedPresets.activePresetId);
                useUIStore.setState({ activePresetId: mergedPresets.activePresetId });
            } catch (_) {}
        }
    } finally {
        restoreTimestampKey(PRESETS_UPDATED_AT_KEY, prevPresetsTs, remotePresetsUpdatedAtMs, { adoptRemote: adoptRemoteTimestamp && remotePresetsUpdatedAtMs > 0 });
        restoreTimestampKey(SETTINGS_UPDATED_AT_KEY, prevSettingsTs, 0, { adoptRemote: false });
        endRemoteApply(0);
    }
}

function applyRemoteTabsMetaToStores(tabsData, { pinnedTabsOverride = undefined, remoteTabsUpdatedAtMs = 0, adoptRemoteTimestamp = false } = {}) {
    if (!tabsData && pinnedTabsOverride === undefined) return;
    const prevTabsTs = (() => {
        try { return localStorage.getItem(TABS_UPDATED_AT_KEY); } catch (_) { return null; }
    })();
    const prevSettingsTs = (() => {
        try { return localStorage.getItem(SETTINGS_UPDATED_AT_KEY); } catch (_) { return null; }
    })();
    beginRemoteApply();
    try {
        if (tabsData && typeof tabsData === 'object') {
            const uiUpdate = {};
            const settingsPatch = {};
            if (Array.isArray(tabsData.customSpaces) && tabsData.customSpaces.length > 0) {
                uiUpdate.customSpaces = tabsData.customSpaces;
                settingsPatch.customSpaces = tabsData.customSpaces;
            }
            if (Array.isArray(tabsData.spaceOrder)) {
                uiUpdate.spaceOrder = tabsData.spaceOrder;
                settingsPatch.spaceOrder = tabsData.spaceOrder;
            }
            if (Object.keys(uiUpdate).length > 0) {
                useUIStore.setState(state => ({
                    ...uiUpdate,
                    settings: {
                        ...(state.settings || {}),
                        ...settingsPatch
                    }
                }));
            }
        }
        const resolvedPinned = pinnedTabsOverride !== undefined
            ? pinnedTabsOverride
            : (tabsData && Array.isArray(tabsData.pinnedTabs) ? tabsData.pinnedTabs : undefined);
        if (Array.isArray(resolvedPinned)) {
            useTabStore.getState().setPinnedTabs(resolvedPinned);
        }
    } finally {
        restoreTimestampKey(TABS_UPDATED_AT_KEY, prevTabsTs, remoteTabsUpdatedAtMs, { adoptRemote: adoptRemoteTimestamp && remoteTabsUpdatedAtMs > 0 });
        restoreTimestampKey(SETTINGS_UPDATED_AT_KEY, prevSettingsTs, 0, { adoptRemote: false });
        endRemoteApply(0);
    }
}

function applySyncedUIPresetsAndTheme(decryptedSettings, remoteUpdatedAtMs = 0) {
    if (!decryptedSettings || typeof decryptedSettings !== 'object') return;
    const uiStore = useUIStore.getState();
    const localPresetsUpdatedAtMs = parseTimestampMs((() => {
        try { return localStorage.getItem(PRESETS_UPDATED_AT_KEY); } catch (_) { return ''; }
    })());
    const mergedPresets = mergePresetsAndOverrides({
        localCustomPresets: uiStore.customPresets || [],
        remoteCustomPresets: Array.isArray(decryptedSettings._syncCustomPresets) ? decryptedSettings._syncCustomPresets : [],
        localOverrides: uiStore.presetOverrides || {},
        remoteOverrides: (decryptedSettings._syncPresetOverrides && typeof decryptedSettings._syncPresetOverrides === 'object') ? decryptedSettings._syncPresetOverrides : {},
        localActivePresetId: uiStore.activePresetId || uiStore.activePreset || 'default',
        remoteActivePresetId: decryptedSettings._syncActivePresetId || decryptedSettings._syncActivePreset || '',
        remoteDeletedPresetIds: decryptedSettings._syncDeletedPresetIds || null,
        remotePresetsUpdatedAtMs: remoteUpdatedAtMs,
        localPresetsUpdatedAtMs,
        localPresetsDirty
    });
    applyRemotePresetsToUIStore(mergedPresets, remoteUpdatedAtMs, { adoptRemoteTimestamp: remoteUpdatedAtMs > localPresetsUpdatedAtMs });

    const prevSettingsTs = (() => {
        try { return localStorage.getItem(SETTINGS_UPDATED_AT_KEY); } catch (_) { return null; }
    })();
    beginRemoteApply();
    try {
        if (decryptedSettings._syncTheme && decryptedSettings._syncTheme !== uiStore.theme && typeof uiStore.setTheme === 'function') {
            try {
                uiStore.setTheme(decryptedSettings._syncTheme);
            } catch (_) {}
        }
        if (decryptedSettings._syncAccentColor && decryptedSettings._syncAccentColor !== uiStore.accentColor && typeof uiStore.setAccentColor === 'function') {
            try {
                uiStore.setAccentColor(decryptedSettings._syncAccentColor);
            } catch (_) {}
        }
    } finally {
        restoreTimestampKey(SETTINGS_UPDATED_AT_KEY, prevSettingsTs, remoteUpdatedAtMs, { adoptRemote: remoteUpdatedAtMs > 0 });
        endRemoteApply(0);
    }
}

function parseVaultItemMeta(item) {
    const rawTitle = typeof item?.title === 'string' ? item.title : '';
    const sepIdx = rawTitle.indexOf('|||');
    let parsedMeta = {};
    if (sepIdx !== -1) {
        const jsonPart = rawTitle.slice(sepIdx + 3).trim();
        if (jsonPart) {
            try {
                const candidate = JSON.parse(jsonPart);
                if (candidate && typeof candidate === 'object') {
                    parsedMeta = candidate;
                }
            } catch (_) {}
        }
    }
    const cleanBaseTitle = sepIdx !== -1 ? rawTitle.slice(0, sepIdx) : rawTitle;
    const meta = {
        type: item?.itemType || item?.type || parsedMeta.type || parsedMeta.itemType || 'login',
        notes: (item?.notes ?? parsedMeta.notes ?? '') || '',
        totpSecret: (item?.totpSecret ?? parsedMeta.totpSecret ?? null) || null,
        passkeyData: (item?.passkeyData ?? parsedMeta.passkeyData ?? null) || null,
        cardData: (item?.cardData ?? parsedMeta.cardData ?? null) || null,
        addressData: (item?.addressData ?? parsedMeta.addressData ?? null) || null,
    };
    return { cleanBaseTitle, meta };
}

function buildSerializedVaultTitle(item, fallbackBaseTitle = '') {
    const { cleanBaseTitle, meta } = parseVaultItemMeta(item);
    const finalBaseTitle = cleanBaseTitle || fallbackBaseTitle;
    return `${finalBaseTitle}|||${JSON.stringify(meta)}`;
}

async function readLocalVaultForBackup(passphrase) {
    const vaultStore = useVaultStore.getState();

    if (vaultStore.isUnlocked && window.electronAPI?.getPasswords) {
        try {
            const res = await window.electronAPI.getPasswords();
            if (Array.isArray(res)) {
                if (res.length > 0) return res;
                if (Array.isArray(vaultStore.passwords) && vaultStore.passwords.length > 0) {
                    return vaultStore.passwords;
                }
                return res;
            }
        } catch (_) {}
        if (Array.isArray(vaultStore.passwords) && vaultStore.passwords.length > 0) {
            return vaultStore.passwords;
        }
    }

    if (window.electronAPI) {
        let status = null;
        try {
            status = await window.electronAPI.getVaultStatus?.();
        } catch (_) {}

        if (status?.isUnlocked && window.electronAPI.getPasswords) {
            try {
                const res = await window.electronAPI.getPasswords();
                return Array.isArray(res) ? res : [];
            } catch (_) {}
        }
    }

    return Array.isArray(vaultStore.passwords) ? vaultStore.passwords : [];
}

const LEGACY_PRESETS_DELETED_KEY = 'qbrowse_deleted_presets';

function removeIdsFromDeletedStorageKey(storageKey, idSet) {
    if (!storageKey || idSet.size === 0) return;
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const filtered = parsed.filter(entry => {
                const entryId = typeof entry === 'object' && entry !== null ? entry.id : entry;
                return !idSet.has(String(entryId));
            });
            if (filtered.length !== parsed.length) {
                localStorage.setItem(storageKey, JSON.stringify(filtered));
            }
        } else if (parsed && typeof parsed === 'object') {
            let changed = false;
            idSet.forEach(id => {
                if (Object.prototype.hasOwnProperty.call(parsed, id)) {
                    delete parsed[id];
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem(storageKey, JSON.stringify(parsed));
            }
        }
    } catch (_) {}
}

function clearDeletedPresetIdsForRestore(presetsList, extraIds = []) {
    const idSet = new Set();
    if (Array.isArray(presetsList)) {
        presetsList.forEach(p => {
            if (p && p.id !== undefined && p.id !== null) {
                idSet.add(String(p.id));
            } else if (typeof p === 'string' && p) {
                idSet.add(p);
            }
        });
    }
    (extraIds || []).forEach(id => {
        if (id && id !== 'default') idSet.add(String(id));
    });
    if (idSet.size === 0) return;
    removeIdsFromDeletedStorageKey(PRESETS_DELETED_IDS_KEY, idSet);
    removeIdsFromDeletedStorageKey(LEGACY_PRESETS_DELETED_KEY, idSet);
}

function normalizeTabListActiveFlag(tabs, preferredActiveId = null) {
    if (!Array.isArray(tabs) || tabs.length === 0) return [];
    let chosenIdx = -1;
    if (preferredActiveId) {
        chosenIdx = tabs.findIndex(t => t && t.id === preferredActiveId);
    }
    if (chosenIdx === -1) {
        chosenIdx = tabs.findIndex(t => t && t.active);
    }
    if (chosenIdx === -1) {
        chosenIdx = 0;
    }
    return tabs.map((t, idx) => ({
        ...t,
        active: idx === chosenIdx
    }));
}

function applyRemoteOpenTabsToTabStore(targetTabs, { preserveCloudTabs = false } = {}) {
    if (!targetTabs) return;
    const tabStore = useTabStore.getState();
    let cleanPrivate = [];
    let cleanWork = [];
    let cleanCustom = {};

    if (Array.isArray(targetTabs)) {
        targetTabs.filter(isValidSyncTab).forEach(t => {
            if (t.spaceId === 'work') cleanWork.push(t);
            else if (t.spaceId && t.spaceId !== 'personal' && t.spaceId !== 'private') {
                if (!cleanCustom[t.spaceId]) cleanCustom[t.spaceId] = [];
                cleanCustom[t.spaceId].push(t);
            } else {
                cleanPrivate.push(t);
            }
        });
    } else if (typeof targetTabs === 'object') {
        cleanPrivate = (targetTabs.privateTabs || []).filter(isValidSyncTab);
        cleanWork = (targetTabs.workTabs || []).filter(isValidSyncTab);
        if (targetTabs.customSpaceTabs && typeof targetTabs.customSpaceTabs === 'object') {
            Object.entries(targetTabs.customSpaceTabs).forEach(([sId, list]) => {
                if (Array.isArray(list)) {
                    const validList = list.filter(isValidSyncTab);
                    if (validList.length > 0) {
                        cleanCustom[sId] = validList;
                    }
                }
            });
        }
    }

    const prevActiveId = tabStore.activeTabId || null;
    cleanPrivate = normalizeTabListActiveFlag(cleanPrivate, prevActiveId);
    cleanWork = normalizeTabListActiveFlag(cleanWork, prevActiveId);
    Object.keys(cleanCustom).forEach(sId => {
        cleanCustom[sId] = normalizeTabListActiveFlag(cleanCustom[sId], prevActiveId);
    });

    if (!preserveCloudTabs) {
        tabStore.setCloudTabs?.({
            privateTabs: cleanPrivate,
            workTabs: cleanWork,
            customSpaceTabs: cleanCustom
        });
    }

    // Always call setPrivateTabs even if empty so closed/removed tabs don't linger
    tabStore.setPrivateTabs?.(cleanPrivate);
    if (cleanWork.length > 0 || (typeof targetTabs === 'object' && !Array.isArray(targetTabs) && Array.isArray(targetTabs.workTabs))) {
        tabStore.setWorkTabs?.(cleanWork);
    }
    if (typeof targetTabs === 'object' && !Array.isArray(targetTabs) && targetTabs.customSpaceTabs && typeof targetTabs.customSpaceTabs === 'object') {
        Object.keys(tabStore.customSpaceTabs || {}).forEach(sId => {
            if (!cleanCustom[sId] && typeof tabStore.setTabsForSpace === 'function') {
                tabStore.setTabsForSpace(sId, []);
            }
        });
    }
    Object.entries(cleanCustom).forEach(([sId, list]) => {
        if (typeof tabStore.setTabsForSpace === 'function') {
            tabStore.setTabsForSpace(sId, list);
        }
    });

    const allRestoredEntries = [
        ...cleanPrivate.map(t => ({ tab: t, space: 'personal' })),
        ...cleanWork.map(t => ({ tab: t, space: 'work' })),
        ...Object.entries(cleanCustom).flatMap(([sId, list]) => list.map(t => ({ tab: t, space: sId })))
    ];

    const currentActiveExists = prevActiveId && allRestoredEntries.some(e => e.tab.id === prevActiveId);
    if (!currentActiveExists) {
        const currentSpace = tabStore.activeSpace || 'personal';
        const spaceMatch = allRestoredEntries.find(e => e.space === currentSpace && e.tab.active)
            || allRestoredEntries.find(e => e.space === currentSpace)
            || allRestoredEntries.find(e => e.tab.active)
            || allRestoredEntries[0]
            || null;
        if (spaceMatch) {
            if (typeof tabStore.setActiveTab === 'function') {
                tabStore.setActiveTab(spaceMatch.tab.id, spaceMatch.space);
            }
            if (typeof useTabStore.setState === 'function') {
                useTabStore.setState({ activeTabId: spaceMatch.tab.id });
            }
        } else if (typeof useTabStore.setState === 'function' && 'activeTabId' in tabStore) {
            useTabStore.setState({ activeTabId: null });
        }
    }
}

async function applySnapshotPayload(get, payloadRoot, passToUse) {
    const targetSettings = payloadRoot.settings || payloadRoot.uiSettings || payloadRoot.preferences;
    const targetVaultRaw = payloadRoot.vault || payloadRoot.passwords;
    const targetVault = Array.isArray(targetVaultRaw)
        ? targetVaultRaw
        : (targetVaultRaw && Array.isArray(targetVaultRaw.items) ? targetVaultRaw.items : null);
    const targetTabs = payloadRoot.tabs;
    const targetCustomSpaces = payloadRoot.customSpaces || payloadRoot.tabs?.customSpaces;
    const targetSpaceOrder = payloadRoot.spaceOrder || payloadRoot.tabs?.spaceOrder;
    const targetHistory = payloadRoot.history || payloadRoot.historyEntries;
    const targetPinned = payloadRoot.pinnedTabs || payloadRoot.pinned || payloadRoot.pinnedApps || payloadRoot.tabs?.pinnedTabs;

    beginRemoteApply();
    try {
        // 1. Restore Settings & Presets
        if ((targetSettings && typeof targetSettings === 'object') || Array.isArray(payloadRoot.customPresets)) {
            const uiStore = useUIStore.getState();
            const normalizedSettings = { ...(targetSettings || {}) };
            if (!Array.isArray(normalizedSettings._syncCustomPresets)) {
                if (Array.isArray(normalizedSettings.customPresets)) {
                    normalizedSettings._syncCustomPresets = normalizedSettings.customPresets;
                } else if (Array.isArray(payloadRoot.customPresets)) {
                    normalizedSettings._syncCustomPresets = payloadRoot.customPresets;
                }
            }
            if (!normalizedSettings._syncPresetOverrides || typeof normalizedSettings._syncPresetOverrides !== 'object') {
                if (normalizedSettings.presetOverrides && typeof normalizedSettings.presetOverrides === 'object') {
                    normalizedSettings._syncPresetOverrides = normalizedSettings.presetOverrides;
                } else if (payloadRoot.presetOverrides && typeof payloadRoot.presetOverrides === 'object') {
                    normalizedSettings._syncPresetOverrides = payloadRoot.presetOverrides;
                }
            }
            if (!normalizedSettings._syncActivePresetId) {
                normalizedSettings._syncActivePresetId =
                    normalizedSettings.activePresetId ||
                    normalizedSettings.activePreset ||
                    payloadRoot.activePresetId ||
                    '';
            }
            if (!normalizedSettings._syncTheme && normalizedSettings.theme) {
                normalizedSettings._syncTheme = normalizedSettings.theme;
            }
            if (!normalizedSettings._syncAccentColor && normalizedSettings.accentColor) {
                normalizedSettings._syncAccentColor = normalizedSettings.accentColor;
            }

            if (targetSettings && typeof targetSettings === 'object') {
                Object.keys(targetSettings).forEach(k => {
                    if (k.startsWith('_sync') || k === 'syncedCloudSettings') return;
                    if (targetSettings[k] !== undefined && typeof uiStore.setSettingValue === 'function') {
                        uiStore.setSettingValue(k, targetSettings[k]);
                    }
                });
            }

            // Clear snapshot preset IDs from deleted tombstones so previously deleted presets restore cleanly
            clearDeletedPresetIdsForRestore(
                normalizedSettings._syncCustomPresets,
                [normalizedSettings._syncActivePresetId]
            );

            const localPresetsTs = parseTimestampMs((() => {
                try { return localStorage.getItem(PRESETS_UPDATED_AT_KEY); } catch (_) { return ''; }
            })());
            const restorePresetsTs = Math.max(Date.now(), localPresetsTs + 1);
            applySyncedUIPresetsAndTheme(normalizedSettings, restorePresetsTs);

            localSettingsDirty = true;
            localPresetsDirty = true;
            try {
                const ts = String(restorePresetsTs);
                localStorage.setItem(SETTINGS_UPDATED_AT_KEY, ts);
                localStorage.setItem(PRESETS_UPDATED_AT_KEY, ts);
            } catch (_) {}
        }

        // 2. Restore Vault Passwords (ignoring tombstones and forcing snapshot items)
        if (Array.isArray(targetVault)) {
            if (targetVault.length > 0) {
                const vaultState = useVaultStore.getState();
                if (!vaultState.isUnlocked && !vaultState.isInitialized && passToUse && passToUse !== 'qbrowse_local') {
                    try {
                        const unlocked = await vaultState.unlock(passToUse);
                        if (!unlocked) useVaultStore.setState({ error: null });
                    } catch (_) {}
                }
                if (useVaultStore.getState().isUnlocked) {
                    await get().mergeRemoteVault(targetVault, passToUse, [], { isSnapshotRestore: true });
                    await useVaultStore.getState().fetchPasswords?.();
                } else {
                    const cleanRestoreVault = targetVault.filter(item => item && !isRawCiphertextString(item.password));
                    if (cleanRestoreVault.length > 0) {
                        useVaultStore.setState({ cloudVaultBackup: cleanRestoreVault });
                    }
                }
            } else if (useVaultStore.getState().isUnlocked) {
                await useVaultStore.getState().fetchPasswords?.();
            }
        }

        // 3. Restore Custom Spaces & Space Order
        if ((Array.isArray(targetCustomSpaces) && targetCustomSpaces.length > 0) || Array.isArray(targetSpaceOrder)) {
            const uiPatch = {};
            const settingsPatch = {};
            if (Array.isArray(targetCustomSpaces) && targetCustomSpaces.length > 0) {
                uiPatch.customSpaces = targetCustomSpaces;
                settingsPatch.customSpaces = targetCustomSpaces;
            }
            if (Array.isArray(targetSpaceOrder)) {
                uiPatch.spaceOrder = targetSpaceOrder;
                settingsPatch.spaceOrder = targetSpaceOrder;
            }
            useUIStore.setState(state => ({
                ...uiPatch,
                settings: {
                    ...(state.settings || {}),
                    ...settingsPatch
                }
            }));
            const tabStore = useTabStore.getState();
            if (Array.isArray(targetCustomSpaces) && targetCustomSpaces.length > 0 && typeof tabStore.setCustomSpaces === 'function') {
                tabStore.setCustomSpaces(targetCustomSpaces);
            }
            localTabsDirty = true;
            try {
                localStorage.setItem(TABS_UPDATED_AT_KEY, String(Date.now()));
            } catch (_) {}
        }

        // 4. Restore Tabs (handles both structured object and legacy flat array)
        if (targetTabs) {
            applyRemoteOpenTabsToTabStore(targetTabs);
            localTabsDirty = true;
            try {
                localStorage.setItem(TABS_UPDATED_AT_KEY, String(Date.now()));
            } catch (_) {}
        }

        // 5. Restore History
        if (Array.isArray(targetHistory) && targetHistory.length > 0) {
            useHistoryStore.getState().mergeRemoteHistory(normalizeRemoteHistoryItems(targetHistory));
        }

        // 6. Restore Pinned Tabs
        if (Array.isArray(targetPinned)) {
            useTabStore.getState().setPinnedTabs(targetPinned);
            localTabsDirty = true;
            try {
                localStorage.setItem(TABS_UPDATED_AT_KEY, String(Date.now()));
            } catch (_) {}
        }
    } finally {
        endRemoteApply(0);
    }
}

function setupLocalStoreWatchers() {
    if (storeUnsubscribers.length > 0) return;

    try {
        watchersArmed = false;
        if (watcherArmTimer) {
            clearTimeout(watcherArmTimer);
        }
        watcherArmTimer = setTimeout(() => {
            watcherArmTimer = null;
            refreshObservedWatcherSignatures();
            watchersArmed = true;
        }, 3500);

        refreshObservedWatcherSignatures();

        const unsubTabs = useTabStore.subscribe((state) => {
            if (!watchersArmed || isApplyingRemoteSync || isApplyingCloudUpdate) {
                lastObservedTabSig = computeTabsWatcherSignature(state);
                lastObservedSharedTabsMetaSig = computeSharedTabsMetaSignature(useUIStore.getState(), state);
                return;
            }
            const nextSig = computeTabsWatcherSignature(state);
            const nextSharedMetaSig = computeSharedTabsMetaSignature(useUIStore.getState(), state);
            if (nextSharedMetaSig !== lastObservedSharedTabsMetaSig) {
                lastObservedSharedTabsMetaSig = nextSharedMetaSig;
                localTabsDirty = true;
                try {
                    localStorage.setItem(TABS_UPDATED_AT_KEY, String(Date.now()));
                } catch (_) {}
            }
            if (nextSig !== lastObservedTabSig) {
                lastObservedTabSig = nextSig;
                const current = useSyncStore.getState();
                if (current.autoSyncEnabled && current.user && current.masterPassword) {
                    current.triggerDebouncedSync(30000);
                }
            }
        });

        const unsubVault = useVaultStore.subscribe((state) => {
            if (!watchersArmed || isApplyingRemoteSync || isApplyingCloudUpdate) {
                lastObservedVaultSig = computeVaultWatcherSignature(state);
                lastObservedVaultUnlocked = Boolean(state?.isUnlocked);
                if (lastObservedVaultUnlocked) {
                    lastObservedVaultMap = buildLocalVaultSnapshotMap(state?.passwords);
                }
                return;
            }
            const isNowUnlocked = Boolean(state?.isUnlocked);
            const nextMap = isNowUnlocked ? buildLocalVaultSnapshotMap(state?.passwords) : new Map();
            if (isNowUnlocked && lastObservedVaultUnlocked) {
                const deletedEntries = [];
                for (const [id, entry] of lastObservedVaultMap.entries()) {
                    if (!nextMap.has(id)) {
                        deletedEntries.push(entry);
                    }
                }
                if (deletedEntries.length > 0) {
                    recordLocalVaultDeletions(deletedEntries, state?.passwords || []);
                }
            }
            lastObservedVaultUnlocked = isNowUnlocked;
            if (isNowUnlocked) {
                lastObservedVaultMap = nextMap;
            }

            const nextSig = computeVaultWatcherSignature(state);
            if (nextSig !== lastObservedVaultSig) {
                lastObservedVaultSig = nextSig;
                const current = useSyncStore.getState();
                if (current.autoSyncEnabled && current.user && current.masterPassword) {
                    current.triggerDebouncedSync(12000);
                }
            }
        });

        const unsubUI = useUIStore.subscribe((state) => {
            if (!watchersArmed || isApplyingRemoteSync || isApplyingCloudUpdate) {
                lastObservedSettingsSig = computeSettingsWatcherSignature(state);
                lastObservedPresetsSig = computePresetsWatcherSignature(state);
                lastObservedPresetIds = new Set((state?.customPresets || []).map(p => p && String(p.id)).filter(Boolean));
                lastObservedSharedTabsMetaSig = computeSharedTabsMetaSignature(state, useTabStore.getState());
                return;
            }
            const nextSettingsSig = computeSettingsWatcherSignature(state);
            const nextPresetsSig = computePresetsWatcherSignature(state);
            const nextSharedMetaSig = computeSharedTabsMetaSignature(state, useTabStore.getState());
            let shouldSync = false;

            if (nextSettingsSig !== lastObservedSettingsSig) {
                lastObservedSettingsSig = nextSettingsSig;
                localSettingsDirty = true;
                shouldSync = true;
                try {
                    localStorage.setItem(SETTINGS_UPDATED_AT_KEY, String(Date.now()));
                } catch (_) {}
            }

            if (nextSharedMetaSig !== lastObservedSharedTabsMetaSig) {
                lastObservedSharedTabsMetaSig = nextSharedMetaSig;
                localTabsDirty = true;
                shouldSync = true;
                try {
                    localStorage.setItem(TABS_UPDATED_AT_KEY, String(Date.now()));
                } catch (_) {}
            }

            if (nextPresetsSig !== lastObservedPresetsSig) {
                lastObservedPresetsSig = nextPresetsSig;
                localPresetsDirty = true;
                shouldSync = true;
                const nextIds = new Set((state?.customPresets || []).map(p => p && String(p.id)).filter(Boolean));
                const nowMs = Date.now();
                const deletedMap = getLocalDeletedPresetIds();
                for (const prevId of lastObservedPresetIds) {
                    if (!nextIds.has(prevId)) {
                        deletedMap[prevId] = nowMs;
                    }
                }
                for (const nextId of nextIds) {
                    delete deletedMap[nextId];
                }
                saveLocalDeletedPresetIds(deletedMap);
                lastObservedPresetIds = nextIds;
                try {
                    localStorage.setItem(PRESETS_UPDATED_AT_KEY, String(nowMs));
                } catch (_) {}
            }

            if (shouldSync) {
                const current = useSyncStore.getState();
                if (current.autoSyncEnabled && current.user && current.masterPassword) {
                    current.triggerDebouncedSync(15000);
                }
            }
        });

        storeUnsubscribers.push(unsubTabs, unsubVault, unsubUI);
    } catch (e) {
        console.warn('[AutoSync] Notice on store subscribers:', e);
    }
}

const useSyncStore = create((set, get) => ({
    user: null,
    masterPassword: '',
    syncKeyError: false,
    isAuthInitialized: false,
    authError: null,
    isSyncing: false,
    syncStatus: 'idle', // 'idle' | 'synced' | 'syncing' | 'permission-error' | 'error' | 'offline'
    lastSyncTime: localStorage.getItem('qbrowse_last_sync') || null,
    syncedItemsCount: 0,
    cloudBackups: [],
    isLoadingBackups: false,
    isCreatingBackup: false,
    isRestoringBackup: false,
    restoringBackupId: null,

    // Cross-Device Cloud Tabs Sync
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
    remoteDeviceTabs: [],
    isRefreshingTabs: false,

    // Auto-Sync Configuration
    autoSyncEnabled: localStorage.getItem('qbrowse_auto_sync') !== 'false',
    autoSyncIntervalMinutes: 15,

    syncCategories: (() => {
        try {
            const stored = localStorage.getItem('qbrowse_sync_categories');
            if (stored) return JSON.parse(stored);
        } catch(e) {}
        return { vault: true, settings: true, tabs: true, history: true };
    })(),

    toggleSyncCategory: (categoryKey) => {
        set((state) => {
            const next = { ...state.syncCategories, [categoryKey]: !state.syncCategories[categoryKey] };
            localStorage.setItem('qbrowse_sync_categories', JSON.stringify(next));
            return { syncCategories: next };
        });
    },

    setMasterPassword: (passphrase) => {
        set({ masterPassword: passphrase, syncKeyError: false });
        if (passphrase && get().user) {
            get().listenToCloudSync();
        }
        const wrapPromise = saveWrappedPassphrase(passphrase);
        if (passphrase && useVaultStore.getState().isUnlocked) {
            get().syncVaultOnUnlock?.().catch(() => {});
        }
        if (typeof window !== 'undefined' && window.__vaultStore) {
            window.__vaultStore.getState().syncVaultStatus?.().catch(() => {});
        }
        return wrapPromise;
    },

    receiveVaultMasterPassword: async (vaultMp) => {
        if (!vaultMp) return;
        const { user, masterPassword } = get();
        if (!user) return;
        if (!masterPassword) {
            set({ masterPassword: vaultMp, syncKeyError: false });
            await saveWrappedPassphrase(vaultMp);
            get().listenToCloudSync();
            get().syncNow({ silent: true }).catch(() => {});
        }
    },

    updateMasterPasswordAndResync: async (newPass) => {
        if (!newPass) return;
        set({ masterPassword: newPass, syncKeyError: false });
        await saveWrappedPassphrase(newPass);
        const { user, autoSyncEnabled, syncCategories } = get();
        if (user && (autoSyncEnabled || syncCategories?.vault !== false)) {
            await get().syncNow({ silent: true }).catch(() => {});
        }
    },

    unlockSyncVault: async (passphrase) => {
        if (!passphrase) return false;
        await get().setMasterPassword(passphrase);
        if (get().user) {
            if (unsubscribeCloudListeners.length === 0) {
                get().listenToCloudSync();
            }
            get().syncNow({ silent: true }).catch(() => {});
        }
        return true;
    },

    mergeRemoteVault: async (remoteVaultItems, masterPassword, remoteTombstonesInput = null, options = {}) => {
        if (masterPassword && typeof masterPassword === 'object' && remoteTombstonesInput === null) {
            remoteTombstonesInput = masterPassword;
            masterPassword = null;
        }
        const runMerge = async () => {
            const isSnapshotRestore = Boolean(options?.isSnapshotRestore);
            const rawRemote = Array.isArray(remoteVaultItems)
                ? remoteVaultItems
                : (remoteVaultItems && Array.isArray(remoteVaultItems.items) ? remoteVaultItems.items : []);
            const pass = masterPassword || get().masterPassword;
            const embeddedTombstones = (!Array.isArray(remoteVaultItems) && remoteVaultItems?.deletedIds)
                ? { deletedIds: remoteVaultItems.deletedIds, deletedKeys: remoteVaultItems.deletedKeys || {} }
                : null;
            const mergedTombstones = mergeVaultTombstones(
                getLocalVaultTombstones(),
                mergeVaultTombstones(embeddedTombstones, remoteTombstonesInput)
            );

            // Filter out any corrupted raw ciphertext passwords
            const cleanRemote = rawRemote.filter(item => item && !isRawCiphertextString(item.password));

            if (isSnapshotRestore && cleanRemote.length > 0) {
                for (const remoteItem of cleanRemote) {
                    if (remoteItem.id !== undefined && remoteItem.id !== null) {
                        delete mergedTombstones.deletedIds[String(remoteItem.id)];
                    }
                    const stableKey = getVaultStableKey(remoteItem);
                    if (stableKey) {
                        delete mergedTombstones.deletedKeys[stableKey];
                    }
                }
                saveLocalVaultTombstones(mergedTombstones);
            }

            const hasTombstones = Object.keys(mergedTombstones.deletedIds).length > 0
                || Object.keys(mergedTombstones.deletedKeys).length > 0;
            if (cleanRemote.length === 0 && (isSnapshotRestore || !hasTombstones)) {
                return { added: 0, updated: 0, deleted: 0 };
            }

            beginRemoteApply();
            try {
                const uiWasUnlocked = Boolean(useVaultStore.getState().isUnlocked);
                let canAccessElectronVault = uiWasUnlocked;

                if (!canAccessElectronVault && window.electronAPI) {
                    try {
                        const vaultStatus = await window.electronAPI.getVaultStatus?.();
                        if (vaultStatus?.isUnlocked) {
                            canAccessElectronVault = true;
                        }
                    } catch (_) {}
                }

                let localPasswords = [];
                if (canAccessElectronVault && window.electronAPI?.getPasswords) {
                    try {
                        localPasswords = (await window.electronAPI.getPasswords()) || [];
                    } catch (_) {}
                } else if (!window.electronAPI?.getPasswords && uiWasUnlocked) {
                    localPasswords = [...(useVaultStore.getState().passwords || [])];
                } else {
                    // Local vault isn't unlocked yet; stash in volatile RAM only without unlocking QVault
                    if (cleanRemote.length > 0) {
                        useVaultStore.setState({ cloudVaultBackup: cleanRemote });
                    }
                    try {
                        localStorage.removeItem('qbrowse_vault_cloud_pending');
                    } catch (_) {}
                    saveLocalVaultTombstones(mergedTombstones);
                    return { added: 0, updated: 0, deleted: 0 };
                }

                const norm = (s) => (s ? String(s).trim().toLowerCase() : '');
                const isNumericId = (v) => /^\d+$/.test(String(v || ''));
                let deletedCount = 0;
                let updatedCount = 0;
                let addedCount = 0;
                const deletedLocalIds = new Set();

                // 1. Apply deletion tombstones to existing local items (skipped during snapshot restore)
                if (!isSnapshotRestore && hasTombstones) {
                    for (const lp of localPasswords) {
                        if (!lp || lp.id === undefined || lp.id === null) continue;
                        const lpIdStr = String(lp.id);
                        const lpKey = getVaultStableKey(lp);
                        const idDelTs = mergedTombstones.deletedIds[lpIdStr] || 0;
                        const keyDelTs = lpKey ? (mergedTombstones.deletedKeys[lpKey] || 0) : 0;
                        const effectiveDelTs = Math.max(idDelTs, keyDelTs);
                        const localUpdated = parseTimestampMs(lp.updatedAt || lp.createdAt);
                        if (effectiveDelTs > 0 && effectiveDelTs > localUpdated) {
                            if (window.electronAPI?.deletePassword) {
                                try {
                                    const removed = await window.electronAPI.deletePassword(lp.id);
                                    if (removed !== false) {
                                        deletedLocalIds.add(lpIdStr);
                                        deletedCount++;
                                    }
                                } catch (err) {
                                    console.warn('[Sync] deletePassword during tombstone sync failed:', err);
                                }
                            } else {
                                deletedLocalIds.add(lpIdStr);
                                deletedCount++;
                            }
                        }
                    }
                }

                const activeLocalPasswords = localPasswords.filter(lp => lp && !deletedLocalIds.has(String(lp.id)));

                // 2. Merge remote items by id (and stable url/title/username fallback)
                for (const remoteItem of cleanRemote) {
                    const remoteMetaInfo = parseVaultItemMeta(remoteItem);
                    const remoteUrl = norm(remoteItem.url);
                    const remoteUser = norm(remoteItem.username);
                    const remoteTitle = norm(remoteMetaInfo.cleanBaseTitle);
                    const remoteIdStr = remoteItem.id !== undefined && remoteItem.id !== null ? String(remoteItem.id) : '';
                    const remoteKey = getVaultStableKey(remoteItem);
                    const remoteUpdated = parseTimestampMs(remoteItem.updatedAt || remoteItem.createdAt);

                    if (isSnapshotRestore) {
                        if (remoteIdStr) delete mergedTombstones.deletedIds[remoteIdStr];
                        if (remoteKey) delete mergedTombstones.deletedKeys[remoteKey];
                    } else {
                        const idTombstone = remoteIdStr ? (mergedTombstones.deletedIds[remoteIdStr] || 0) : 0;
                        const keyTombstone = remoteKey ? (mergedTombstones.deletedKeys[remoteKey] || 0) : 0;
                        const itemTombstone = Math.max(idTombstone, keyTombstone);

                        if (itemTombstone > 0) {
                            if (remoteUpdated > itemTombstone) {
                                if (remoteIdStr) delete mergedTombstones.deletedIds[remoteIdStr];
                                if (remoteKey) delete mergedTombstones.deletedKeys[remoteKey];
                            } else {
                                continue;
                            }
                        }
                    }

                    // Prefer id match (guarding numeric SQLite auto-increment collisions across distinct sites)
                    let localMatch = null;
                    if (remoteIdStr) {
                        localMatch = activeLocalPasswords.find(lp => {
                            if (lp.id === undefined || lp.id === null || String(lp.id) !== remoteIdStr) return false;
                            const lpUrl = norm(lp.url);
                            const lpTitle = norm(lp.title?.split('|||')[0]);
                            const lpUser = norm(lp.username);
                            const sameUser = lpUser === remoteUser;
                            const sameUrl = Boolean(remoteUrl && lpUrl && (lpUrl === remoteUrl || lpUrl.includes(remoteUrl) || remoteUrl.includes(lpUrl)));
                            const sameTitle = Boolean(remoteTitle && lpTitle && lpTitle === remoteTitle);
                            if (isNumericId(remoteIdStr) && remoteUrl && lpUrl && !sameUrl && !sameTitle && !sameUser) {
                                return false;
                            }
                            return true;
                        });
                    }

                    // Fallback match by normalized (username, url|title)
                    if (!localMatch) {
                        localMatch = activeLocalPasswords.find(lp => {
                            const lpUrl = norm(lp.url);
                            const lpUser = norm(lp.username);
                            const lpTitle = norm(lp.title?.split('|||')[0]);
                            const sameUser = (lpUser === remoteUser);
                            const sameUrl = (remoteUrl && lpUrl && (lpUrl === remoteUrl || lpUrl.includes(remoteUrl) || remoteUrl.includes(lpUrl)));
                            const sameTitle = (remoteTitle && lpTitle && lpTitle === remoteTitle);
                            return sameUser && (sameUrl || sameTitle);
                        });
                    }

                    if (localMatch) {
                        if (isSnapshotRestore) {
                            if (localMatch.id !== undefined && localMatch.id !== null) {
                                delete mergedTombstones.deletedIds[String(localMatch.id)];
                            }
                            const localMatchKey = getVaultStableKey(localMatch);
                            if (localMatchKey) delete mergedTombstones.deletedKeys[localMatchKey];
                        }

                        const localMetaInfo = parseVaultItemMeta(localMatch);
                        const effectiveTitle = remoteMetaInfo.cleanBaseTitle || localMetaInfo.cleanBaseTitle || '';
                        const serializedRemoteTitle = buildSerializedVaultTitle(remoteItem, localMetaInfo.cleanBaseTitle);
                        const serializedLocalTitle = buildSerializedVaultTitle(localMatch);

                        const localUpdated = parseTimestampMs(localMatch.updatedAt || localMatch.createdAt);
                        const hasChanges = (remoteItem.password && remoteItem.password !== localMatch.password)
                            || serializedRemoteTitle !== serializedLocalTitle
                            || ((remoteItem.url || '') !== (localMatch.url || ''))
                            || ((remoteItem.username || '') !== (localMatch.username || ''));

                        if (hasChanges && (isSnapshotRestore || remoteUpdated > localUpdated)) {
                            if (window.electronAPI?.updatePassword) {
                                try {
                                    await window.electronAPI.updatePassword(
                                        localMatch.id,
                                        serializedRemoteTitle,
                                        remoteItem.url ?? localMatch.url ?? '',
                                        remoteItem.username ?? localMatch.username ?? '',
                                        remoteItem.password || localMatch.password || ''
                                    );
                                    updatedCount++;
                                } catch (err) {
                                    console.warn('[Sync] updatePassword during mergeRemoteVault failed:', err);
                                }
                            } else {
                                Object.assign(localMatch, {
                                    title: effectiveTitle,
                                    url: remoteItem.url ?? localMatch.url ?? '',
                                    username: remoteItem.username ?? localMatch.username ?? '',
                                    password: remoteItem.password || localMatch.password || '',
                                    itemType: remoteMetaInfo.meta.type,
                                    notes: remoteMetaInfo.meta.notes,
                                    totpSecret: remoteMetaInfo.meta.totpSecret,
                                    passkeyData: remoteMetaInfo.meta.passkeyData,
                                    cardData: remoteMetaInfo.meta.cardData,
                                    addressData: remoteMetaInfo.meta.addressData,
                                    updatedAt: remoteItem.updatedAt || new Date(remoteUpdated || Date.now()).toISOString()
                                });
                                updatedCount++;
                            }
                        }
                    } else {
                        const serializedNewTitle = buildSerializedVaultTitle(remoteItem, 'Synced Account');
                        if (window.electronAPI?.addPassword) {
                            try {
                                const created = await window.electronAPI.addPassword(
                                    serializedNewTitle,
                                    remoteItem.url || '',
                                    remoteItem.username || '',
                                    remoteItem.password || ''
                                );
                                if (created) activeLocalPasswords.push(created);
                                addedCount++;
                            } catch (err) {
                                console.warn('[Sync] addPassword during mergeRemoteVault failed:', err);
                            }
                        } else {
                            activeLocalPasswords.push({
                                ...remoteItem,
                                id: remoteItem.id || `vault_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                                title: remoteMetaInfo.cleanBaseTitle || 'Synced Account',
                                itemType: remoteMetaInfo.meta.type,
                                notes: remoteMetaInfo.meta.notes,
                                totpSecret: remoteMetaInfo.meta.totpSecret,
                                passkeyData: remoteMetaInfo.meta.passkeyData,
                                cardData: remoteMetaInfo.meta.cardData,
                                addressData: remoteMetaInfo.meta.addressData
                            });
                            addedCount++;
                        }
                    }
                }

                saveLocalVaultTombstones(mergedTombstones);
                try {
                    localStorage.removeItem('qbrowse_vault_cloud_pending');
                } catch (_) {}

                if (!window.electronAPI?.getPasswords && (addedCount > 0 || updatedCount > 0 || deletedCount > 0)) {
                    useVaultStore.setState({
                        passwords: activeLocalPasswords,
                        vaultItemCount: activeLocalPasswords.length
                    });
                }

                // After merging, refresh open QVault UI immediately
                if (useVaultStore.getState().isUnlocked) {
                    await useVaultStore.getState().fetchPasswords?.();
                }
                return { added: addedCount, updated: updatedCount, deleted: deletedCount };
            } catch (err) {
                console.warn('[Sync] mergeRemoteVault error:', err);
                return { added: 0, updated: 0, deleted: 0 };
            } finally {
                endRemoteApply(0);
            }
        };

        const chained = vaultMergeChain.then(runMerge, runMerge);
        vaultMergeChain = chained.catch(() => {});
        return chained;
    },

    syncVaultOnUnlock: async () => {
        if (vaultUnlockSyncInFlight) {
            return vaultUnlockSyncInFlight;
        }
        const { user, masterPassword, syncCategories } = get();
        const syncEnabled = syncCategories?.vault !== false;
        if (!user || !syncEnabled || !masterPassword) return;
        if (!useVaultStore.getState().isUnlocked) return;

        const runUnlockSync = async () => {
            const userRef = doc(db, 'users', user.uid);
            let existingData = null;
            let remoteFetchSucceeded = false;

            try {
                const docSnap = await getDoc(userRef);
                existingData = docSnap && docSnap.exists() ? docSnap.data() : null;
                remoteFetchSucceeded = true;
            } catch (fetchErr) {
                console.warn('[Sync] syncVaultOnUnlock getDoc notice:', fetchErr);
            }

            let remoteVaultRaw = null;
            let remoteVault = [];
            if (existingData?.vault?.encrypted) {
                try {
                    remoteVaultRaw = await decryptData(existingData.vault.encrypted, masterPassword);
                    const extracted = Array.isArray(remoteVaultRaw)
                        ? remoteVaultRaw
                        : (Array.isArray(remoteVaultRaw?.items) ? remoteVaultRaw.items : []);
                    remoteVault = extracted.filter(item => item && !isRawCiphertextString(item.password));
                } catch (_) {}
            }

            const pendingBackup = useVaultStore.getState().cloudVaultBackup;
            if (remoteVault.length === 0 && Array.isArray(pendingBackup) && pendingBackup.length > 0) {
                remoteVault = pendingBackup.filter(item => item && !isRawCiphertextString(item.password));
            }
            if (pendingBackup) {
                useVaultStore.setState({ cloudVaultBackup: null });
            }

            let remoteTombstones = null;
            if (existingData?.vaultDeletedIds?.encrypted) {
                try {
                    remoteTombstones = await decryptData(existingData.vaultDeletedIds.encrypted, masterPassword);
                } catch (_) {}
            } else if (existingData?.vaultDeletedIds && typeof existingData.vaultDeletedIds === 'object') {
                remoteTombstones = existingData.vaultDeletedIds;
            }

            const embeddedTombstones = (!Array.isArray(remoteVaultRaw) && remoteVaultRaw?.deletedIds)
                ? { deletedIds: remoteVaultRaw.deletedIds, deletedKeys: remoteVaultRaw.deletedKeys || {} }
                : null;
            const mergedVaultDeletedIds = mergeVaultTombstones(
                getLocalVaultTombstones(),
                mergeVaultTombstones(embeddedTombstones, remoteTombstones)
            );

            const hasTombstones = Object.keys(mergedVaultDeletedIds.deletedIds).length > 0
                || Object.keys(mergedVaultDeletedIds.deletedKeys).length > 0;

            if (remoteVault.length > 0 || hasTombstones) {
                await get().mergeRemoteVault(remoteVault, masterPassword, mergedVaultDeletedIds);
            } else {
                saveLocalVaultTombstones(mergedVaultDeletedIds);
            }

            await useVaultStore.getState().fetchPasswords?.();

            let finalPasswords = [];
            if (window.electronAPI?.getPasswords) {
                try {
                    const res = await window.electronAPI.getPasswords();
                    finalPasswords = Array.isArray(res) ? res : (useVaultStore.getState().passwords || []);
                } catch (_) {
                    finalPasswords = useVaultStore.getState().passwords || [];
                }
            } else {
                finalPasswords = useVaultStore.getState().passwords || [];
            }
            const cleanVault = (finalPasswords || []).filter(item => item && !isRawCiphertextString(item.password));
            useVaultStore.setState({ vaultItemCount: cleanVault.length });

            const finalTombstones = getLocalVaultTombstones();
            lastObservedVaultMap = buildLocalVaultSnapshotMap(cleanVault);
            lastObservedVaultSig = computeVaultWatcherSignature(useVaultStore.getState());

            if (!remoteFetchSucceeded) return;

            const vaultSig = JSON.stringify({
                items: cleanVault.map(v => ({
                    id: v.id,
                    u: v.username,
                    url: v.url,
                    p: v.password,
                    t: v.title,
                    it: v.itemType || v.type || 'login',
                    n: v.notes || '',
                    ts: v.totpSecret || null,
                    pk: v.passkeyData || null,
                    cd: v.cardData || null,
                    ad: v.addressData || null,
                    up: v.updatedAt
                })),
                tombstones: finalTombstones
            });

            const nowMs = Date.now();
            const nowIso = new Date(nowMs).toISOString();
            const currentDeviceId = getOrCreateDeviceId();
            const encrypted = await encryptData(cleanVault, masterPassword);
            const encryptedTombstones = await encryptData(finalTombstones, masterPassword);

            const prevLastLocalWriteIso = lastLocalWriteIso;
            lastLocalWriteIso = nowIso;
            try {
                await setDoc(userRef, {
                    vault: { encrypted, updatedAt: nowMs },
                    vaultDeletedIds: { encrypted: encryptedTombstones, updatedAt: nowMs },
                    lastSync: nowIso,
                    lastSyncDeviceId: currentDeviceId
                }, { merge: true });
                lastSyncedSignatures.vault = vaultSig;
            } catch (pushErr) {
                lastLocalWriteIso = prevLastLocalWriteIso;
                console.warn('[Sync] syncVaultOnUnlock push notice:', pushErr);
            }
        };

        vaultUnlockSyncInFlight = runUnlockSync().finally(() => {
            vaultUnlockSyncInFlight = null;
        });
        return vaultUnlockSyncInFlight;
    },

    startAutoSync: (intervalMinutes = 15) => {
        if (autoSyncIntervalTimer) {
            clearInterval(autoSyncIntervalTimer);
            autoSyncIntervalTimer = null;
        }
        setupLocalStoreWatchers();

        const ms = Math.max(5, intervalMinutes) * 60 * 1000;
        autoSyncIntervalTimer = setInterval(() => {
            const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
            if (autoSyncEnabled && user && masterPassword && !isSyncing && !isApplyingCloudUpdate && !isApplyingRemoteSync) {
                get().syncNow({ silent: true }).catch(() => {});
            }
        }, ms);

        // Silent warm-up sync after 12 seconds if ready and not recently synced
        setTimeout(() => {
            const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
            if (
                autoSyncEnabled &&
                user &&
                masterPassword &&
                !isSyncing &&
                !isApplyingCloudUpdate &&
                !isApplyingRemoteSync &&
                Date.now() - lastAutoSyncExecutedAt > MIN_AUTO_SYNC_COOLDOWN_MS
            ) {
                get().syncNow({ silent: true }).catch(() => {});
            }
        }, 12000);
    },

    stopAutoSync: () => {
        if (autoSyncIntervalTimer) {
            clearInterval(autoSyncIntervalTimer);
            autoSyncIntervalTimer = null;
        }
        if (debounceSyncTimer) {
            clearTimeout(debounceSyncTimer);
            debounceSyncTimer = null;
        }
    },

    triggerDebouncedSync: (delayMs = 25000) => {
        const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
        if (!autoSyncEnabled || !user || !masterPassword || isSyncing || isApplyingCloudUpdate || isApplyingRemoteSync) {
            return;
        }
        if (debounceSyncTimer) {
            clearTimeout(debounceSyncTimer);
        }
        const elapsedSinceLast = Date.now() - lastAutoSyncExecutedAt;
        const cooldownRemaining = Math.max(0, MIN_AUTO_SYNC_COOLDOWN_MS - elapsedSinceLast);
        const effectiveDelay = Math.max(delayMs, cooldownRemaining, 10000);
        debounceSyncTimer = setTimeout(() => {
            debounceSyncTimer = null;
            const state = get();
            if (state.autoSyncEnabled && state.user && state.masterPassword && !state.isSyncing && !isApplyingCloudUpdate && !isApplyingRemoteSync) {
                state.syncNow({ silent: true }).catch(() => {});
            }
        }, effectiveDelay);
    },

    flushDebouncedSync: () => {
        if (debounceSyncTimer) {
            clearTimeout(debounceSyncTimer);
            debounceSyncTimer = null;
            const state = get();
            if (state.autoSyncEnabled && state.user && state.masterPassword && !state.isSyncing && !isApplyingCloudUpdate && !isApplyingRemoteSync) {
                state.syncNow({ silent: true }).catch(() => {});
            }
        }
    },

    toggleAutoSync: () => {
        const next = !get().autoSyncEnabled;
        set({ autoSyncEnabled: next });
        localStorage.setItem('qbrowse_auto_sync', next ? 'true' : 'false');
        if (next) {
            get().startAutoSync();
            useUIStore.getState().showToast("Auto-Sync active (syncs periodically & on changes)");
        } else {
            get().stopAutoSync();
            useUIStore.getState().showToast("Auto-Sync turned off");
        }
    },

    setAutoSyncEnabled: (enabled) => {
        set({ autoSyncEnabled: enabled });
        localStorage.setItem('qbrowse_auto_sync', enabled ? 'true' : 'false');
        if (enabled) {
            get().startAutoSync();
        } else {
            get().stopAutoSync();
        }
    },

    initAuth: () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                set({
                    user,
                    isAuthInitialized: true,
                    syncStatus: get().isSyncing ? get().syncStatus : 'idle'
                });
                try {
                    await user.getIdToken();
                } catch(e) {}

                // Load OS-wrapped passphrase if available (keep QVault locked until explicit unlock/login)
                let currentPass = get().masterPassword;
                if (!currentPass) {
                    currentPass = await loadWrappedPassphrase();
                    if (currentPass && !get().masterPassword) {
                        set({ masterPassword: currentPass, syncKeyError: false });
                        if (typeof window !== 'undefined' && window.__vaultStore) {
                            try { await window.__vaultStore.getState().syncVaultStatus?.(); } catch (_) {}
                        } else {
                            try { await useVaultStore.getState().syncVaultStatus?.(); } catch (_) {}
                        }
                    }
                }

                // Auto-heal any legacy bloated root document to stay strictly under the 1MB limit
                healBloatedRootDocument(user.uid).catch(() => {});

                setTimeout(() => {
                    if (!get().user || get().user.uid !== user.uid) return;
                    if (unsubscribeCloudListeners.length === 0 && get().masterPassword) {
                        get().listenToCloudSync();
                    }
                    get().fetchCloudBackups();
                    if (get().autoSyncEnabled) {
                        get().startAutoSync();
                    }
                }, 100);
            } else {
                hasSyncedThisSession = false;
                sessionSyncedUid = '';
                hasAppliedInitialCloudSnapshot = false;
                localSettingsDirty = false;
                localTabsDirty = false;
                localPresetsDirty = false;
                set({ user: null, isAuthInitialized: true, syncStatus: 'offline' });
                get().stopListening();
                get().stopAutoSync();
            }
        });
    },

    signUp: async (email, password, masterPass) => {
        set({ authError: null, isSyncing: true, syncStatus: 'syncing' });
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const passToUse = masterPass || password;
            hasSyncedThisSession = false;
            sessionSyncedUid = '';
            hasAppliedInitialCloudSnapshot = false;
            set({ user: userCred.user });
            await get().setMasterPassword(passToUse);
            if (unsubscribeCloudListeners.length === 0) {
                get().listenToCloudSync();
            }
            set({ isSyncing: false });
            await get().syncNow(true);
            if (get().syncStatus !== 'offline' && get().syncStatus !== 'error') {
                set({ syncStatus: 'synced' });
            }
            useUIStore.getState().setSetupComplete(true);
            if (get().autoSyncEnabled) {
                get().startAutoSync();
            }
            useUIStore.getState().showToast("Account Created & Cloud Sync Active!");
            return true;
        } catch (error) {
            const formatted = formatAuthError(error);
            set({ authError: formatted, isSyncing: false, syncStatus: 'error' });
            return false;
        }
    },

    signIn: async (email, password, masterPass) => {
        set({ authError: null, isSyncing: true, syncStatus: 'syncing' });
        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            const passToUse = masterPass || password;
            hasSyncedThisSession = false;
            sessionSyncedUid = '';
            hasAppliedInitialCloudSnapshot = false;
            localSettingsDirty = false;
            localTabsDirty = false;
            localPresetsDirty = false;
            set({ user: userCred.user });
            await get().setMasterPassword(passToUse);
            if (passToUse) {
                try {
                    const unlocked = await useVaultStore.getState().unlock(passToUse);
                    if (!unlocked) {
                        useVaultStore.setState({ error: null });
                    }
                } catch (_) {}
            }
            if (unsubscribeCloudListeners.length === 0) {
                get().listenToCloudSync();
            }
            set({ isSyncing: false });
            await get().syncNow({ isInitialLogin: true, silent: false });
            await get().fetchCloudBackups();
            if (get().syncStatus !== 'offline' && get().syncStatus !== 'error') {
                set({ syncStatus: 'synced' });
            }
            useUIStore.getState().setSetupComplete(true);
            if (get().autoSyncEnabled) {
                get().startAutoSync();
            }
            useUIStore.getState().showToast("Signed In to QBrowse Cloud Sync");
            return true;
        } catch (error) {
            const formatted = formatAuthError(error);
            set({ authError: formatted, isSyncing: false, syncStatus: 'error' });
            return false;
        }
    },

    logout: async () => {
        get().stopListening();
        get().stopAutoSync();
        lastSyncedSignatures = { settings: '', vault: '', tabs: '', pinnedTabs: '', history: '', presets: '' };
        lastLocalWriteIso = '';
        hasSyncedThisSession = false;
        sessionSyncedUid = '';
        hasAppliedInitialCloudSnapshot = false;
        localSettingsDirty = false;
        localTabsDirty = false;
        localPresetsDirty = false;
        await signOut(auth);
        await saveWrappedPassphrase('');
        set({ 
            user: null, 
            masterPassword: '',
            lastSyncTime: null, 
            syncedItemsCount: 0, 
            cloudBackups: [],
            remoteDeviceTabs: [],
            syncStatus: 'offline',
            authError: null 
        });
        useUIStore.getState().showToast("Signed out of QBrowse Cloud");
    },

    changePassword: async (currentPassword, newPassword) => {
        const { user } = get();
        if (!user || !user.email) throw new Error("No active user logged in");
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            useUIStore.getState().showToast("Account password updated successfully!");
            return true;
        } catch(error) {
            console.error("Change password error:", error);
            const msg = (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
                ? "Incorrect current password"
                : error.message.replace(/^Firebase:\s*/, '');
            throw new Error(msg);
        }
    },

    stopListening: () => {
        unsubscribeCloudListeners.forEach(unsub => {
            try { unsub(); } catch(e) {}
        });
        unsubscribeCloudListeners = [];
    },

    syncDataToCloud: async (dataName, dataPayload) => {
        const { user, masterPassword, syncCategories } = get();
        if (!user) return;
        if (syncCategories && syncCategories[dataName] === false) {
            return;
        }
        if (!masterPassword) {
            console.warn('[Sync] Cannot sync to cloud: Master Password not set');
            throw new Error("Master Password or Account Passphrase required for encryption");
        }
        
        const prevLastLocalWriteIso = lastLocalWriteIso;
        try {
            const encrypted = await encryptData(dataPayload, masterPassword);
            const nowIso = new Date().toISOString();
            const currentDeviceId = getOrCreateDeviceId();
            const updateDocPayload = {
                [dataName]: {
                    encrypted,
                    updatedAt: nowIso
                },
                lastSync: nowIso,
                lastSyncDeviceId: currentDeviceId,
                userAgent: navigator.userAgent
            };

            if (dataName === 'vault' && Array.isArray(dataPayload)) {
                const nextIds = new Set(dataPayload.filter(Boolean).map(p => String(p.id)));
                const deletedEntries = [];
                for (const [id, entry] of lastObservedVaultMap.entries()) {
                    if (!nextIds.has(id)) {
                        deletedEntries.push(entry);
                    }
                }
                if (deletedEntries.length > 0) {
                    recordLocalVaultDeletions(deletedEntries, dataPayload);
                }
                lastObservedVaultMap = buildLocalVaultSnapshotMap(dataPayload);
                const tombstones = getLocalVaultTombstones();
                if (Object.keys(tombstones.deletedIds).length > 0 || Object.keys(tombstones.deletedKeys).length > 0) {
                    updateDocPayload.vaultDeletedIds = {
                        encrypted: await encryptData(tombstones, masterPassword),
                        updatedAt: nowIso
                    };
                }
            }

            lastLocalWriteIso = nowIso;

            const rootRef = doc(db, 'users', user.uid);
            try {
                await setDoc(rootRef, updateDocPayload, { merge: true });
            } catch(writeErr) {
                if (writeErr?.message && writeErr.message.includes('exceeds the maximum allowed size')) {
                    console.warn("[Sync] Document size limit detected during sync. Healing root document...");
                    await healBloatedRootDocument(user.uid);
                    await setDoc(rootRef, updateDocPayload, { merge: true });
                } else {
                    lastLocalWriteIso = prevLastLocalWriteIso;
                    throw writeErr;
                }
            }

            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem('qbrowse_last_sync', nowTime);
            set({ lastSyncTime: nowTime, syncStatus: 'synced', authError: null });
        } catch (error) {
            lastLocalWriteIso = prevLastLocalWriteIso;
            console.warn(`[Sync] Notice during ${dataName} cloud sync:`, error.message);
            set({ syncStatus: 'offline', authError: null });
            throw error;
        }
    },

    syncNow: async (options = false) => {
        const silent = typeof options === 'boolean' ? options : Boolean(options?.silent);
        const isInitialLogin = typeof options === 'object' && options !== null ? Boolean(options.isInitialLogin) : false;
        const { user, masterPassword, syncCategories, isSyncing } = get();
        if (!user) {
            if (!silent) useUIStore.getState().showToast("Sign in to sync your data");
            return;
        }
        if (!masterPassword) {
            if (!silent) useUIStore.getState().showToast("Encryption key required. Please enter your account password in profile.");
            set({ syncStatus: 'error', authError: 'Master encryption passphrase missing.' });
            return;
        }
        if (isSyncing) return;

        if (vaultUnlockSyncInFlight) {
            try { await vaultUnlockSyncInFlight; } catch (_) {}
        }

        lastAutoSyncExecutedAt = Date.now();
        set({ isSyncing: true, syncStatus: 'syncing', authError: null });
        const prevLastLocalWriteIso = lastLocalWriteIso;
        try {
            let totalItems = 0;
            const nowIso = new Date().toISOString();
            const nowMs = new Date(nowIso).getTime();
            const rootBatchUpdate = {};
            const updatedSigs = {};
            const rootRef = doc(db, 'users', user.uid);
            const currentDeviceId = getOrCreateDeviceId();

            const startSettingsTsRaw = (() => { try { return localStorage.getItem(SETTINGS_UPDATED_AT_KEY); } catch (_) { return null; } })();
            const startTabsTsRaw = (() => { try { return localStorage.getItem(TABS_UPDATED_AT_KEY); } catch (_) { return null; } })();
            const startPresetsTsRaw = (() => { try { return localStorage.getItem(PRESETS_UPDATED_AT_KEY); } catch (_) { return null; } })();

            // Fetch current remote state BEFORE pushing so a fresh/stale client merges cloud data instead of overwriting it
            const existingRootSnap = await getDoc(rootRef);
            const existingData = existingRootSnap && existingRootSnap.exists() ? existingRootSnap.data() : null;
            let pulledRemoteHistory = [];
            let appliedRemoteChanges = false;

            if (existingData) {
                const localSettingsUpdatedAt = parseTimestampMs(startSettingsTsRaw);
                const localTabsUpdatedAt = parseTimestampMs(startTabsTsRaw);
                const localPresetsUpdatedAt = parseTimestampMs(startPresetsTsRaw);

                const remoteSettingsUpdatedAt = parseTimestampMs(existingData.settings?.updatedAt);
                const remoteTabsUpdatedAt = parseTimestampMs(existingData.tabs?.updatedAt);
                const remotePinnedUpdatedAt = parseTimestampMs(existingData.pinnedTabs?.updatedAt);
                const remoteEffectiveTabsUpdatedAt = Math.max(remoteTabsUpdatedAt, remotePinnedUpdatedAt);
                const remotePresetsUpdatedAt = parseTimestampMs(existingData.presets?.updatedAt) || remoteSettingsUpdatedAt;
                const remoteHistoryUpdatedAt = parseTimestampMs(existingData.history?.updatedAt);
                const remoteVaultUpdatedAt = Math.max(
                    parseTimestampMs(existingData.vault?.updatedAt),
                    parseTimestampMs(existingData.vaultDeletedIds?.updatedAt)
                );

                const isFirstSyncOfSession = !hasSyncedThisSession || sessionSyncedUid !== user.uid;
                const shouldInspectRemote = isInitialLogin
                    || isFirstSyncOfSession
                    || remoteSettingsUpdatedAt > localSettingsUpdatedAt
                    || remoteEffectiveTabsUpdatedAt > localTabsUpdatedAt
                    || remotePresetsUpdatedAt > localPresetsUpdatedAt
                    || remoteHistoryUpdatedAt > 0
                    || remoteVaultUpdatedAt > 0;

                if (shouldInspectRemote) {
                    beginRemoteApply();
                    appliedRemoteChanges = true;
                    try {
                        let remoteSettings = null;
                        if ((syncCategories?.settings !== false) && existingData.settings?.encrypted) {
                            try {
                                remoteSettings = await decryptData(existingData.settings.encrypted, masterPassword);
                            } catch (_) {}
                        }

                        let remotePresetsPayload = null;
                        if ((syncCategories?.settings !== false) && existingData.presets?.encrypted) {
                            try {
                                remotePresetsPayload = await decryptData(existingData.presets.encrypted, masterPassword);
                            } catch (_) {}
                        }

                        // 0a. Settings LWW pull (unconditional on initial login, otherwise when remote is newer and local isn't dirty)
                        if (
                            syncCategories?.settings !== false &&
                            remoteSettings &&
                            typeof remoteSettings === 'object' &&
                            (
                                isInitialLogin ||
                                (
                                    !localSettingsDirty &&
                                    (
                                        remoteSettingsUpdatedAt > localSettingsUpdatedAt ||
                                        (isFirstSyncOfSession && localSettingsUpdatedAt === 0 && remoteSettingsUpdatedAt === 0)
                                    )
                                )
                            )
                        ) {
                            applyRemoteSettingsToUIStore(remoteSettings, remoteSettingsUpdatedAt);
                            lastSyncedSignatures.settings = JSON.stringify(remoteSettings);
                        }

                        // 0b. Presets non-destructive union merge + activePresetId timestamp check (unconditional on initial login)
                        if (syncCategories?.settings !== false && (remotePresetsPayload || remoteSettings)) {
                            const uiBeforePresets = useUIStore.getState();
                            const remoteCustomPresets = Array.isArray(remotePresetsPayload?.customPresets)
                                ? remotePresetsPayload.customPresets
                                : (Array.isArray(remoteSettings?._syncCustomPresets) ? remoteSettings._syncCustomPresets : []);
                            const remoteOverrides = (remotePresetsPayload?.presetOverrides && typeof remotePresetsPayload.presetOverrides === 'object')
                                ? remotePresetsPayload.presetOverrides
                                : ((remoteSettings?._syncPresetOverrides && typeof remoteSettings._syncPresetOverrides === 'object') ? remoteSettings._syncPresetOverrides : {});
                            const remoteActivePresetId = remotePresetsPayload?.activePresetId
                                || remoteSettings?._syncActivePresetId
                                || remoteSettings?._syncActivePreset
                                || '';
                            const remoteDeletedPresetIds = remotePresetsPayload?.deletedPresetIds
                                || remoteSettings?._syncDeletedPresetIds
                                || null;

                            const mergedPresets = mergePresetsAndOverrides({
                                localCustomPresets: uiBeforePresets.customPresets || [],
                                remoteCustomPresets,
                                localOverrides: uiBeforePresets.presetOverrides || {},
                                remoteOverrides,
                                localActivePresetId: uiBeforePresets.activePresetId || uiBeforePresets.activePreset || 'default',
                                remoteActivePresetId,
                                remoteDeletedPresetIds,
                                remotePresetsUpdatedAtMs: remotePresetsUpdatedAt,
                                localPresetsUpdatedAtMs: isInitialLogin ? 0 : localPresetsUpdatedAt,
                                localPresetsDirty: isInitialLogin ? false : localPresetsDirty
                            });
                            applyRemotePresetsToUIStore(mergedPresets, remotePresetsUpdatedAt, {
                                adoptRemoteTimestamp: isInitialLogin || (remotePresetsUpdatedAt > localPresetsUpdatedAt && !localPresetsDirty)
                            });
                        }

                        // 0c. Vault pull: merge only when unlocked; never unlock silently on periodic sync
                        if (syncCategories?.vault !== false && (existingData.vault?.encrypted || existingData.vaultDeletedIds?.encrypted)) {
                            try {
                                const remoteVaultRaw = existingData.vault?.encrypted
                                    ? await decryptData(existingData.vault.encrypted, masterPassword)
                                    : [];
                                const extractedRemoteVault = Array.isArray(remoteVaultRaw)
                                    ? remoteVaultRaw
                                    : (Array.isArray(remoteVaultRaw?.items) ? remoteVaultRaw.items : []);
                                const cleanRemoteVault = extractedRemoteVault.filter(item => item && !isRawCiphertextString(item.password));

                                let remoteTombstones = null;
                                if (existingData.vaultDeletedIds?.encrypted) {
                                    remoteTombstones = await decryptData(existingData.vaultDeletedIds.encrypted, masterPassword);
                                } else if (existingData.vaultDeletedIds && typeof existingData.vaultDeletedIds === 'object') {
                                    remoteTombstones = existingData.vaultDeletedIds;
                                }
                                const embeddedTombstones = (!Array.isArray(remoteVaultRaw) && remoteVaultRaw?.deletedIds)
                                    ? { deletedIds: remoteVaultRaw.deletedIds, deletedKeys: remoteVaultRaw.deletedKeys || {} }
                                    : null;
                                const combinedRemoteTombstones = mergeVaultTombstones(embeddedTombstones, remoteTombstones);
                                const mergedVaultDeletedIds = mergeVaultTombstones(getLocalVaultTombstones(), combinedRemoteTombstones);
                                const hasTombstones = Object.keys(mergedVaultDeletedIds.deletedIds).length > 0
                                    || Object.keys(mergedVaultDeletedIds.deletedKeys).length > 0;

                                let vaultNow = useVaultStore.getState();
                                if (isInitialLogin && !vaultNow.isInitialized && !vaultNow.isUnlocked && masterPassword) {
                                    try {
                                        await vaultNow.unlock?.(masterPassword);
                                    } catch (_) {}
                                    vaultNow = useVaultStore.getState();
                                }

                                if (vaultNow.isUnlocked) {
                                    if (cleanRemoteVault.length > 0 || hasTombstones) {
                                        await get().mergeRemoteVault(cleanRemoteVault, masterPassword, mergedVaultDeletedIds);
                                    }
                                } else if (cleanRemoteVault.length > 0) {
                                    // Keep QVault locked; stash decrypted backup in RAM so unlocking QVault merges it immediately
                                    useVaultStore.setState({ cloudVaultBackup: cleanRemoteVault });
                                }
                            } catch (_) {}
                        }

                        // 0d. Remote devices tabs + shared pinnedTabs / customSpaces / spaceOrder pull
                        if (syncCategories?.tabs !== false) {
                            let remoteDevicesCount = 0;
                            try {
                                const remoteDevices = await parseRemoteDevicesFromSnapshot(existingData, masterPassword, currentDeviceId);
                                remoteDevicesCount = remoteDevices.length;
                                set({ remoteDeviceTabs: remoteDevices });
                                const aggregatedPrivate = [];
                                const aggregatedWork = [];
                                const aggregatedCustom = {};
                                remoteDevices.forEach(dev => {
                                    (dev.tabs || []).forEach(t => {
                                        if (t.spaceId === 'work') aggregatedWork.push(t);
                                        else if (t.spaceId && t.spaceId !== 'personal') {
                                            if (!aggregatedCustom[t.spaceId]) aggregatedCustom[t.spaceId] = [];
                                            aggregatedCustom[t.spaceId].push(t);
                                        } else {
                                            aggregatedPrivate.push(t);
                                        }
                                    });
                                });
                                useTabStore.getState().setCloudTabs({
                                    privateTabs: aggregatedPrivate,
                                    workTabs: aggregatedWork,
                                    customSpaceTabs: aggregatedCustom
                                });
                            } catch (_) {}

                            let remoteTabsData = null;
                            if (existingData.tabs?.encrypted) {
                                try {
                                    remoteTabsData = await decryptData(existingData.tabs.encrypted, masterPassword);
                                } catch (_) {}
                            }
                            let remotePinnedList = undefined;
                            if (existingData.pinnedTabs?.encrypted) {
                                try {
                                    const decPinned = await decryptData(existingData.pinnedTabs.encrypted, masterPassword);
                                    if (Array.isArray(decPinned)) {
                                        remotePinnedList = decPinned;
                                    }
                                } catch (_) {}
                            }
                            if (remotePinnedList === undefined && remoteTabsData && Array.isArray(remoteTabsData.pinnedTabs)) {
                                remotePinnedList = remoteTabsData.pinnedTabs;
                            }

                            const shouldApplyRemoteTabsMeta = isInitialLogin || (
                                !localTabsDirty && (
                                    remoteEffectiveTabsUpdatedAt > localTabsUpdatedAt ||
                                    (isFirstSyncOfSession && localTabsUpdatedAt === 0 && remoteEffectiveTabsUpdatedAt === 0)
                                )
                            );
                            if (shouldApplyRemoteTabsMeta && (remoteTabsData || remotePinnedList !== undefined)) {
                                applyRemoteTabsMetaToStores(remoteTabsData, {
                                    pinnedTabsOverride: remotePinnedList,
                                    remoteTabsUpdatedAtMs: remoteEffectiveTabsUpdatedAt,
                                    adoptRemoteTimestamp: isInitialLogin || (remoteEffectiveTabsUpdatedAt > localTabsUpdatedAt)
                                });
                            }

                            if (
                                isInitialLogin &&
                                remoteTabsData &&
                                (
                                    Array.isArray(remoteTabsData) ||
                                    Array.isArray(remoteTabsData.privateTabs) ||
                                    Array.isArray(remoteTabsData.workTabs) ||
                                    (remoteTabsData.customSpaceTabs && typeof remoteTabsData.customSpaceTabs === 'object')
                                )
                            ) {
                                applyRemoteOpenTabsToTabStore(remoteTabsData, {
                                    preserveCloudTabs: remoteDevicesCount > 0
                                });
                            }
                        }

                        // 0e. History union merge
                        if (syncCategories?.history !== false && existingData.history?.encrypted) {
                            try {
                                const remoteHistoryRaw = await decryptData(existingData.history.encrypted, masterPassword);
                                if (Array.isArray(remoteHistoryRaw)) {
                                    pulledRemoteHistory = normalizeRemoteHistoryItems(remoteHistoryRaw);
                                    useHistoryStore.getState().mergeRemoteHistory(pulledRemoteHistory);
                                }
                            } catch (_) {}
                        }
                    } finally {
                        endRemoteApply(0);
                    }
                }
            }

            // 1. Sync Settings & Presets
            if (syncCategories?.settings !== false) {
                const uiState = useUIStore.getState();
                const uiSettings = { ...uiState.settings };
                delete uiSettings.syncedCloudSettings;
                if (uiSettings.customWallpaperSource !== 'url') {
                    delete uiSettings.customWallpaper;
                    delete uiSettings.customWallpaperOriginalUrl;
                } else if (uiSettings.customWallpaperOriginalUrl) {
                    uiSettings.customWallpaper = uiSettings.customWallpaperOriginalUrl;
                }
                const deletedPresetIds = getLocalDeletedPresetIds();
                // Include custom presets, overrides, active preset, theme, and accent color in settings payload
                uiSettings._syncActivePresetId = uiState.activePresetId || uiState.activePreset || 'default';
                uiSettings._syncActivePreset = uiSettings._syncActivePresetId;
                uiSettings._syncCustomPresets = uiState.customPresets || [];
                uiSettings._syncPresetOverrides = uiState.presetOverrides || {};
                uiSettings._syncDeletedPresetIds = deletedPresetIds;
                uiSettings._syncTheme = uiState.theme || 'dark';
                uiSettings._syncAccentColor = uiState.accentColor || '#d4bc94';

                const settingsSig = JSON.stringify(uiSettings);
                totalItems += Object.keys(uiSettings).length;
                if (!silent || settingsSig !== lastSyncedSignatures.settings) {
                    const encrypted = await encryptData(uiSettings, masterPassword);
                    rootBatchUpdate.settings = { encrypted, updatedAt: nowIso };
                    updatedSigs.settings = settingsSig;
                }

                const presetsPayload = {
                    customPresets: uiState.customPresets || [],
                    presetOverrides: uiState.presetOverrides || {},
                    activePresetId: uiState.activePresetId || uiState.activePreset || 'default',
                    deletedPresetIds
                };
                const presetsSig = JSON.stringify(presetsPayload);
                if (!silent || presetsSig !== lastSyncedSignatures.presets) {
                    const encryptedPresets = await encryptData(presetsPayload, masterPassword);
                    rootBatchUpdate.presets = { encrypted: encryptedPresets, updatedAt: nowIso };
                    updatedSigs.presets = presetsSig;
                }
            }

            // 2. Sync Vault (Passwords, Passkeys, Cards, Addresses & Notes)
            if (syncCategories?.vault !== false && useVaultStore.getState().isUnlocked === true) {
                const vaultItems = await readLocalVaultForBackup(masterPassword);
                const vaultTombstones = getLocalVaultTombstones();
                const cleanVault = (vaultItems || []).filter(item => item && !isRawCiphertextString(item.password));
                const vaultSig = JSON.stringify({
                    items: cleanVault.map(v => ({
                        id: v.id,
                        u: v.username,
                        url: v.url,
                        p: v.password,
                        t: v.title,
                        it: v.itemType || v.type || 'login',
                        n: v.notes || '',
                        ts: v.totpSecret || null,
                        pk: v.passkeyData || null,
                        cd: v.cardData || null,
                        ad: v.addressData || null,
                        up: v.updatedAt
                    })),
                    tombstones: vaultTombstones
                });
                totalItems += cleanVault.length;
                if (!silent || vaultSig !== lastSyncedSignatures.vault) {
                    const encrypted = await encryptData(cleanVault, masterPassword);
                    rootBatchUpdate.vault = { encrypted, updatedAt: nowIso };
                    rootBatchUpdate.vaultDeletedIds = {
                        encrypted: await encryptData(vaultTombstones, masterPassword),
                        updatedAt: nowIso
                    };
                    updatedSigs.vault = vaultSig;
                }
            }

            // 3. Sync Tabs & Pinned Apps (Personal, Work & Custom Spaces)
            if (syncCategories?.tabs !== false) {
                const uiState = useUIStore.getState();
                const tabState = useTabStore.getState();
                const formatTab = (t) => ({
                    id: t.id,
                    title: getCleanTabTitle(t),
                    url: t.url,
                    lastActiveAt: t.lastActiveAt || Date.now()
                });
                const formatSigTab = (t) => ({
                    id: t.id,
                    title: getCleanTabTitle(t),
                    url: t.url
                });

                const validPrivateTabs = (tabState.privateTabs || [])
                    .filter(isValidSyncTab)
                    .map(formatTab);
                const validWorkTabs = (tabState.workTabs || [])
                    .filter(isValidSyncTab)
                    .map(formatTab);
                const validCustomSpaceTabs = {};
                const sigCustomSpaceTabs = {};
                Object.entries(tabState.customSpaceTabs || {}).forEach(([sId, list]) => {
                    const filtered = (list || []).filter(isValidSyncTab);
                    if (filtered.length > 0) {
                        validCustomSpaceTabs[sId] = filtered.map(formatTab);
                        sigCustomSpaceTabs[sId] = filtered.map(formatSigTab);
                    }
                });
                const pinnedTabsList = Array.isArray(tabState.pinnedTabs)
                    ? tabState.pinnedTabs.map(p => ({ ...p }))
                    : [];

                // Build space lookup map to preserve custom workspace names (customSpaces lives in useUIStore)
                const customSpacesList = getEffectiveCustomSpaces(uiState, tabState);
                const spaceOrderList = getEffectiveSpaceOrder(uiState, tabState);
                const spaceNameMap = { personal: 'Personal', work: 'Work' };
                customSpacesList.forEach(s => {
                    if (s && s.id) spaceNameMap[s.id] = s.name || s.id;
                });

                // Flat tabs list across all spaces with preserved space labels
                const flatTabsList = [
                    ...validPrivateTabs.map(t => ({ ...t, spaceId: 'personal', spaceName: 'Personal' })),
                    ...validWorkTabs.map(t => ({ ...t, spaceId: 'work', spaceName: 'Work' })),
                    ...Object.entries(validCustomSpaceTabs).flatMap(([sId, list]) => {
                        const sName = spaceNameMap[sId] || sId;
                        return (list || []).map(t => ({ ...t, spaceId: sId, spaceName: sName }));
                    })
                ];

                const currentDeviceName = getDeviceName();

                const tabsPayload = {
                    privateTabs: validPrivateTabs,
                    workTabs: validWorkTabs,
                    customSpaceTabs: validCustomSpaceTabs,
                    tabs: flatTabsList,
                    pinnedTabs: pinnedTabsList,
                    customSpaces: customSpacesList,
                    spaceOrder: spaceOrderList,
                    deviceId: currentDeviceId,
                    deviceName: currentDeviceName,
                    lastSynced: Date.now()
                };
                const tabsSig = JSON.stringify({
                    priv: (tabState.privateTabs || []).filter(isValidSyncTab).map(formatSigTab),
                    work: (tabState.workTabs || []).filter(isValidSyncTab).map(formatSigTab),
                    custom: sigCustomSpaceTabs,
                    pins: pinnedTabsList,
                    customSpaces: customSpacesList,
                    spaceOrder: spaceOrderList
                });

                totalItems += (tabsPayload.privateTabs.length + tabsPayload.workTabs.length + pinnedTabsList.length);

                if (!silent || tabsSig !== lastSyncedSignatures.tabs) {
                    const encryptedTabs = await encryptData(tabsPayload, masterPassword);
                    rootBatchUpdate.tabs = { encrypted: encryptedTabs, updatedAt: nowIso };

                    // Preserve existing remote device entries alongside this device's entry
                    const preservedDevices = {
                        ...(existingData?.devices && typeof existingData.devices === 'object' ? existingData.devices : {}),
                        ...(existingData?.deviceTabs && typeof existingData.deviceTabs === 'object' ? existingData.deviceTabs : {})
                    };
                    for (const remDev of (get().remoteDeviceTabs || [])) {
                        if (!remDev || !remDev.deviceId || remDev.deviceId === currentDeviceId || preservedDevices[remDev.deviceId]) {
                            continue;
                        }
                        try {
                            const remEncrypted = await encryptData({
                                deviceId: remDev.deviceId,
                                deviceName: remDev.deviceName || 'Remote Device',
                                lastSynced: remDev.lastSynced || Date.now(),
                                tabs: Array.isArray(remDev.tabs) ? remDev.tabs : []
                            }, masterPassword);
                            preservedDevices[remDev.deviceId] = {
                                deviceId: remDev.deviceId,
                                deviceName: remDev.deviceName || 'Remote Device',
                                lastSynced: remDev.lastSynced || Date.now(),
                                encrypted: remEncrypted,
                                updatedAt: nowIso
                            };
                        } catch (_) {}
                    }

                    // Per-device payload prevents cross-device overwrites
                    const deviceEntry = {
                        deviceId: currentDeviceId,
                        deviceName: currentDeviceName,
                        lastSynced: Date.now(),
                        encrypted: encryptedTabs,
                        updatedAt: nowIso
                    };
                    const mergedDevicesMap = {
                        ...preservedDevices,
                        [currentDeviceId]: deviceEntry
                    };
                    rootBatchUpdate.devices = mergedDevicesMap;
                    rootBatchUpdate.deviceTabs = mergedDevicesMap;
                    rootBatchUpdate.lastSyncDeviceId = currentDeviceId;
                    updatedSigs.tabs = tabsSig;
                }

                // Always sync pinnedTabs (including empty array [] when all tabs are unpinned)
                const pinsSig = JSON.stringify(pinnedTabsList);
                if (!silent || pinsSig !== lastSyncedSignatures.pinnedTabs) {
                    const encryptedPins = await encryptData(pinnedTabsList, masterPassword);
                    rootBatchUpdate.pinnedTabs = { encrypted: encryptedPins, updatedAt: nowIso };
                    updatedSigs.pinnedTabs = pinsSig;
                }
            }

            // 4. Sync History & Bookmarks (limited to 200 items to keep document lightweight)
            if (syncCategories?.history !== false) {
                const localHistoryList = useHistoryStore.getState().history || [];
                const historyPayload = mergeHistoryLists(localHistoryList, pulledRemoteHistory, 200);
                const historySig = JSON.stringify(historyPayload.map(h => `${h.url}|${h.lastVisit || h.timestamp || ''}|${h.visits || h.visitCount || 1}`));
                totalItems += historyPayload.length;
                if (!silent || historySig !== lastSyncedSignatures.history) {
                    const encryptedHistory = await encryptData(historyPayload, masterPassword);
                    rootBatchUpdate.history = { encrypted: encryptedHistory, updatedAt: nowIso };
                    updatedSigs.history = historySig;
                }
            }

            const changedCategoryKeys = Object.keys(rootBatchUpdate);
            if (changedCategoryKeys.length > 0) {
                lastLocalWriteIso = nowIso;
                rootBatchUpdate.lastSync = nowIso;
                rootBatchUpdate.lastSyncDeviceId = currentDeviceId;
                rootBatchUpdate.userAgent = navigator.userAgent;

                try {
                    await setDoc(rootRef, rootBatchUpdate, { merge: true });
                } catch(writeErr) {
                    if (writeErr?.message && writeErr.message.includes('exceeds the maximum allowed size')) {
                        await healBloatedRootDocument(user.uid);
                        await setDoc(rootRef, rootBatchUpdate, { merge: true });
                    } else {
                        lastLocalWriteIso = prevLastLocalWriteIso;
                        throw writeErr;
                    }
                }

                Object.assign(lastSyncedSignatures, updatedSigs);
                if (rootBatchUpdate.settings && (localSettingsDirty || !startSettingsTsRaw || !silent)) {
                    try {
                        localStorage.setItem(SETTINGS_UPDATED_AT_KEY, String(nowMs));
                    } catch (_) {}
                }
                if ((rootBatchUpdate.pinnedTabs || rootBatchUpdate.tabs) && (localTabsDirty || !startTabsTsRaw || !silent)) {
                    try {
                        localStorage.setItem(TABS_UPDATED_AT_KEY, String(nowMs));
                    } catch (_) {}
                }
                if (rootBatchUpdate.presets && (localPresetsDirty || !startPresetsTsRaw || !silent)) {
                    try {
                        localStorage.setItem(PRESETS_UPDATED_AT_KEY, String(nowMs));
                    } catch (_) {}
                }
            }

            hasSyncedThisSession = true;
            sessionSyncedUid = user.uid;

            // Clear dirty flags only if no newer local edits landed while syncNow was awaiting I/O
            try {
                const endSettingsTs = localStorage.getItem(SETTINGS_UPDATED_AT_KEY);
                if (!localSettingsDirty || endSettingsTs === startSettingsTsRaw || endSettingsTs === String(nowMs)) {
                    localSettingsDirty = false;
                }
                const endTabsTs = localStorage.getItem(TABS_UPDATED_AT_KEY);
                if (!localTabsDirty || endTabsTs === startTabsTsRaw || endTabsTs === String(nowMs)) {
                    localTabsDirty = false;
                }
                const endPresetsTs = localStorage.getItem(PRESETS_UPDATED_AT_KEY);
                if (!localPresetsDirty || endPresetsTs === startPresetsTsRaw || endPresetsTs === String(nowMs)) {
                    localPresetsDirty = false;
                }
            } catch (_) {
                localSettingsDirty = false;
                localTabsDirty = false;
                localPresetsDirty = false;
            }
            if (appliedRemoteChanges) {
                refreshObservedWatcherSignatures();
            }

            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem('qbrowse_last_sync', nowTime);
            set({ isSyncing: false, syncStatus: 'synced', lastSyncTime: nowTime, syncedItemsCount: totalItems, authError: null });
            if (!silent) {
                useUIStore.getState().showToast(`Cloud Sync Complete! (${totalItems} items encrypted)`);
            }
        } catch(e) {
            lastLocalWriteIso = prevLastLocalWriteIso;
            console.warn("[Sync] syncNow notice:", e);
            set({ 
                isSyncing: false, 
                syncStatus: 'offline', 
                authError: null 
            });
            if (!silent) {
                useUIStore.getState().showToast("Cloud sync paused. Changes saved locally.");
            }
        }
    },

    // MANUAL BACKUP PUSH
    pushManualBackup: async (customLabel = '') => {
        const { user, masterPassword } = get();
        if (!user) {
            useUIStore.getState().showToast("Sign in to push a cloud backup");
            return false;
        }
        if (!masterPassword) {
            useUIStore.getState().showToast("Encryption passphrase required");
            return false;
        }

        const vaultBeforeBackup = useVaultStore.getState();
        if (vaultBeforeBackup.isInitialized && !vaultBeforeBackup.isUnlocked) {
            const errMsg = 'Please unlock QVault with your PIN or Master Password before creating a cloud snapshot.';
            useUIStore.getState().showToast(errMsg);
            throw new Error(errMsg);
        }

        set({ isCreatingBackup: true, authError: null });
        try {
            if (vaultUnlockSyncInFlight) {
                try { await vaultUnlockSyncInFlight; } catch (_) {}
            }

            // 1. Clean settings to avoid huge base64 wallpaper bloating payload
            const uiState = useUIStore.getState();
            const cleanSettings = { ...uiState.settings };
            delete cleanSettings.syncedCloudSettings;
            if (cleanSettings.customWallpaperSource !== 'url') {
                delete cleanSettings.customWallpaper;
                delete cleanSettings.customWallpaperOriginalUrl;
            } else if (cleanSettings.customWallpaperOriginalUrl) {
                cleanSettings.customWallpaper = cleanSettings.customWallpaperOriginalUrl;
            }
            cleanSettings._syncActivePresetId = uiState.activePresetId || 'default';
            cleanSettings._syncActivePreset = cleanSettings._syncActivePresetId;
            cleanSettings._syncCustomPresets = uiState.customPresets || [];
            cleanSettings._syncPresetOverrides = uiState.presetOverrides || {};
            cleanSettings._syncTheme = uiState.theme || 'dark';
            cleanSettings._syncAccentColor = uiState.accentColor || '#d4bc94';

            const tabState = useTabStore.getState();
            const cleanCustomSpaceTabs = {};
            Object.entries(tabState.customSpaceTabs || {}).forEach(([sId, list]) => {
                const filtered = (list || []).filter(isValidSyncTab).map(t => ({ ...t, title: getCleanTabTitle(t) }));
                if (filtered.length > 0) cleanCustomSpaceTabs[sId] = filtered;
            });

            // Read unlocked QVault items directly without triggering silent unlock
            let unlockedPasswords = [];
            if (useVaultStore.getState().isUnlocked) {
                if (window.electronAPI?.getPasswords) {
                    try {
                        const res = await window.electronAPI.getPasswords();
                        unlockedPasswords = Array.isArray(res) ? res : (useVaultStore.getState().passwords || []);
                    } catch (_) {
                        unlockedPasswords = useVaultStore.getState().passwords || [];
                    }
                } else {
                    unlockedPasswords = useVaultStore.getState().passwords || [];
                }
            }
            const cleanVaultList = (unlockedPasswords || []).filter(item => item && !isRawCiphertextString(item.password));

            // 2. Gather browser state (with safe bounds on history)
            const payload = {
                version: "1.3.5",
                createdAt: new Date().toISOString(),
                label: customLabel.trim() || `Manual Backup (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                settings: cleanSettings,
                vault: cleanVaultList,
                tabs: {
                    privateTabs: (tabState.privateTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    workTabs: (tabState.workTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    customSpaceTabs: cleanCustomSpaceTabs,
                    customSpaces: getEffectiveCustomSpaces(uiState, tabState),
                    spaceOrder: getEffectiveSpaceOrder(uiState, tabState)
                },
                history: (useHistoryStore.getState().history || []).slice(0, 200),
                pinnedTabs: tabState.pinnedTabs || []
            };

            const customTabsCount = Object.values(cleanCustomSpaceTabs).reduce(
                (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
                0
            );
            const totalTabsCount = (payload.tabs?.privateTabs?.length || 0)
                + (payload.tabs?.workTabs?.length || 0)
                + customTabsCount;

            // 3. Encrypt entire payload with AES-GCM
            const encrypted = await encryptData(payload, masterPassword);

            const backupId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const fullBackupRecord = {
                id: backupId,
                label: payload.label,
                createdAt: payload.createdAt,
                stats: {
                    passwords: cleanVaultList.length,
                    tabs: totalTabsCount,
                    history: payload.history?.length || 0
                },
                encrypted
            };

            const backupMetadata = {
                id: backupId,
                label: payload.label,
                createdAt: payload.createdAt,
                stats: fullBackupRecord.stats
            };

            // 4. Save full backup to local storage & IndexedDB as an immediate offline safeguard
            try {
                const localBackups = JSON.parse(localStorage.getItem('qbrowse_local_backups') || '[]');
                const nextLocal = [fullBackupRecord, ...localBackups.filter(b => b.id !== backupId)].slice(0, 8);
                localStorage.setItem('qbrowse_local_backups', JSON.stringify(nextLocal));
            } catch(lsErr) {
                console.warn("[Sync] localStorage backup write notice:", lsErr);
            }
            try {
                localStorage.setItem(`qbrowse_backup_${backupId}`, JSON.stringify(fullBackupRecord));
            } catch (_) {}
            saveIndexedDBBackup(fullBackupRecord).catch(() => {});

            // 5. Save full encrypted backup to backups subcollection
            let subcollectionSaved = false;
            if (user) {
                try {
                    await setDoc(doc(db, 'users', user.uid, 'backups', backupId), fullBackupRecord);
                    subcollectionSaved = true;
                } catch(subErr) {
                    console.warn("[Sync] Subcollection backup write notice (falling back to root doc payload):", subErr);
                }
            }

            // 6. Save to user's root document (ensuring at least the newest 2 backups retain full encrypted payloads)
            let rootSaved = false;
            if (user) {
                const rootRef = doc(db, 'users', user.uid);
                let existingBackups = [];
                try {
                    const userSnap = await getDoc(rootRef);
                    if (userSnap.exists()) {
                        const rootData = userSnap.data() || {};
                        if (Array.isArray(rootData.manual_backups)) {
                            existingBackups = rootData.manual_backups;
                        }
                    }
                } catch(e) {}

                const allMerged = [
                    fullBackupRecord,
                    ...existingBackups.filter(b => b && b.id !== backupId)
                ].slice(0, 5);

                const updatedForRoot = allMerged.map((b, idx) => {
                    const enc = extractEncryptedPayload(b);
                    // Keep encrypted payload for top 2 backups, or all if subcollection wasn't saved
                    if (enc && (!subcollectionSaved || idx < 2)) {
                        return {
                            id: b.id,
                            label: b.label || 'Snapshot',
                            createdAt: b.createdAt || new Date().toISOString(),
                            stats: b.stats || {},
                            encrypted: enc
                        };
                    }
                    return {
                        id: b.id,
                        label: b.label || 'Snapshot',
                        createdAt: b.createdAt || new Date().toISOString(),
                        stats: b.stats || {}
                    };
                });

                try {
                    await setDoc(rootRef, { manual_backups: updatedForRoot }, { merge: true });
                    rootSaved = true;
                } catch(rootErr) {
                    console.warn("[Sync] Root doc backup save notice, attempting self-heal:", rootErr);
                    try {
                        await updateDoc(rootRef, { manual_backups: deleteField() });
                        await setDoc(rootRef, { manual_backups: updatedForRoot }, { merge: true });
                        rootSaved = true;
                    } catch(healErr) {
                        console.warn("[Sync] Root doc heal during backup notice:", healErr);
                    }
                }
            }

            const cloudSaved = subcollectionSaved || rootSaved;

            // In local Zustand state, keep fullBackupRecord available for instant restore
            const currentList = get().cloudBackups || [];
            const nextCloudList = [fullBackupRecord, ...currentList.filter(b => b.id !== backupId)].slice(0, 8);

            set(state => ({
                isCreatingBackup: false,
                cloudBackups: nextCloudList,
                syncStatus: cloudSaved ? 'synced' : 'offline'
            }));

            if (cloudSaved) {
                useUIStore.getState().showToast(`Cloud Snapshot "${payload.label}" pushed successfully!`);
                return true;
            } else {
                useUIStore.getState().showToast(`Snapshot saved to local storage (cloud sync offline).`);
                return true;
            }
        } catch(e) {
            console.warn("[Sync] pushManualBackup notice:", e);
            set({ 
                isCreatingBackup: false, 
                syncStatus: 'offline', 
                authError: null 
            });
            const errMsg = e?.message ? e.message.replace(/^Firebase:\s*/, '') : "Network or size issue";
            useUIStore.getState().showToast(`Backup notice: ${errMsg}`);
            return false;
        }
    },

    // Fetch existing manual backups
    fetchCloudBackups: async () => {
        const { user, masterPassword } = get();
        set({ isLoadingBackups: true });
        try {
            let backups = [];
            if (user) {
                // 1. Fetch from subcollection where full encrypted payloads reside
                try {
                    const subSnap = await getDocs(collection(db, 'users', user.uid, 'backups'));
                    subSnap.forEach(d => {
                        if (d.exists()) {
                            const dData = d.data() || {};
                            const enc = extractEncryptedPayload(dData);
                            backups.push({
                                id: d.id,
                                ...dData,
                                ...(enc ? { encrypted: enc } : {})
                            });
                        }
                    });
                } catch(e) {
                    console.warn("[Sync] Subcollection fetch notice:", e);
                }

                // 2. Fetch metadata & inline backups from root document and merge
                const rootRef = doc(db, 'users', user.uid);
                try {
                    const userSnap = await getDoc(rootRef);
                    if (userSnap.exists()) {
                        const rootData = userSnap.data() || {};
                        const rootList = Array.isArray(rootData.manual_backups) ? rootData.manual_backups : (Array.isArray(rootData.backups) ? rootData.backups : []);
                        for (const r of rootList) {
                            if (!r) continue;
                            const existingIdx = backups.findIndex(b => b.id === r.id);
                            const enc = extractEncryptedPayload(r);
                            if (existingIdx >= 0) {
                                if (enc && !extractEncryptedPayload(backups[existingIdx])) {
                                    backups[existingIdx].encrypted = enc;
                                }
                            } else {
                                backups.push({
                                    id: r.id || `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                                    ...r,
                                    ...(enc ? { encrypted: enc } : {})
                                });
                            }
                        }
                    }
                } catch(e) {
                    console.warn("[Sync] Root doc backups fetch notice:", e);
                }
            }

            // 3. Merge local offline backups (localStorage & IndexedDB)
            try {
                const localB = JSON.parse(localStorage.getItem('qbrowse_local_backups') || '[]');
                if (Array.isArray(localB)) {
                    for (const lb of localB) {
                        if (!lb) continue;
                        const enc = extractEncryptedPayload(lb);
                        const existingIdx = backups.findIndex(b => b.id === lb.id || (b.createdAt && b.createdAt === lb.createdAt));
                        if (existingIdx >= 0) {
                            if (enc && !extractEncryptedPayload(backups[existingIdx])) {
                                backups[existingIdx].encrypted = enc;
                                // Auto-heal backfill: if cloud copy was stripped, re-upload to cloud!
                                if (user) {
                                    try {
                                        setDoc(doc(db, 'users', user.uid, 'backups', backups[existingIdx].id), {
                                            ...backups[existingIdx],
                                            encrypted: enc
                                        }).catch(() => {});
                                    } catch (_) {}
                                }
                            }
                        } else {
                            backups.push({
                                ...lb,
                                ...(enc ? { encrypted: enc } : {})
                            });
                        }
                    }
                }
            } catch(e) {}

            // Check IndexedDB
            try {
                const idbBackups = await getAllIndexedDBBackups();
                if (Array.isArray(idbBackups)) {
                    for (const ib of idbBackups) {
                        if (!ib) continue;
                        const enc = extractEncryptedPayload(ib);
                        const existingIdx = backups.findIndex(b => b.id === ib.id || (b.createdAt && b.createdAt === ib.createdAt));
                        if (existingIdx >= 0) {
                            if (enc && !extractEncryptedPayload(backups[existingIdx])) {
                                backups[existingIdx].encrypted = enc;
                            }
                        } else {
                            backups.push({
                                ...ib,
                                ...(enc ? { encrypted: enc } : {})
                            });
                        }
                    }
                }
            } catch (_) {}

            // 4. Hydrate missing/zero password & tab stats from encrypted payloads when key is available
            const passToUse = masterPassword || useVaultStore.getState().masterPassword;
            if (passToUse) {
                for (let i = 0; i < backups.length; i++) {
                    const bk = backups[i];
                    const enc = extractEncryptedPayload(bk);
                    if (enc && (!bk.stats || typeof bk.stats.passwords !== 'number' || bk.stats.passwords === 0)) {
                        try {
                            const dec = await decryptData(enc, passToUse);
                            if (dec && typeof dec === 'object') {
                                const decPasswordsCount = Array.isArray(dec.vault)
                                    ? dec.vault.length
                                    : (Array.isArray(dec.vault?.items) ? dec.vault.items.length : (bk.stats?.passwords || 0));
                                const decTabsObj = dec.tabs && typeof dec.tabs === 'object' ? dec.tabs : null;
                                const decCustomTabsCount = decTabsObj && decTabsObj.customSpaceTabs && typeof decTabsObj.customSpaceTabs === 'object'
                                    ? Object.values(decTabsObj.customSpaceTabs).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0)
                                    : 0;
                                const decTabsCount = decTabsObj
                                    ? ((decTabsObj.privateTabs?.length || 0) + (decTabsObj.workTabs?.length || 0) + decCustomTabsCount)
                                    : (bk.stats?.tabs || 0);
                                const decHistoryCount = Array.isArray(dec.history) ? dec.history.length : (bk.stats?.history || 0);
                                backups[i] = {
                                    ...bk,
                                    stats: {
                                        ...(bk.stats || {}),
                                        passwords: decPasswordsCount,
                                        tabs: decTabsCount,
                                        history: decHistoryCount
                                    }
                                };
                            }
                        } catch (_) {}
                    }
                }
            }

            backups.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            set({ cloudBackups: backups, isLoadingBackups: false });
        } catch(e) {
            console.warn("[Sync] fetchCloudBackups error:", e);
            set({ isLoadingBackups: false });
        }
    },

    // Restore from a selected manual cloud backup
    restoreCloudBackup: async (backupItem) => {
        const { user, masterPassword } = get();
        if (!backupItem) return false;
        set({ isRestoringBackup: true, restoringBackupId: backupItem.id || 'current' });

        let passToUse = masterPassword;
        if (!passToUse) {
            try { passToUse = await loadWrappedPassphrase(); } catch (_) {}
        }
        if (!passToUse) {
            try { passToUse = useVaultStore.getState().masterPassword; } catch (_) {}
        }
        if (!passToUse && !user) {
            passToUse = 'qbrowse_local';
        }

        if (!passToUse) {
            set({ isRestoringBackup: false, restoringBackupId: null });
            useUIStore.getState().showToast("Enter encryption key in Account Security to restore snapshot");
            return false;
        }

        if (!masterPassword && passToUse && passToUse !== 'qbrowse_local') {
            set({ masterPassword: passToUse });
        }

        const targetId = backupItem.id;
        const targetCreatedAt = backupItem.createdAt;
        const targetLabel = backupItem.label || backupItem.name;

        try {
            let encryptedPayload = extractEncryptedPayload(backupItem);

            // Step 1: In-memory cloudBackups
            if (!encryptedPayload) {
                const memoryBackups = get().cloudBackups || [];
                const memoryMatch = memoryBackups.find(b =>
                    (targetId && b.id === targetId) ||
                    (targetCreatedAt && b.createdAt === targetCreatedAt) ||
                    (targetLabel && b.label === targetLabel)
                );
                if (memoryMatch) {
                    encryptedPayload = extractEncryptedPayload(memoryMatch);
                }
            }

            // Step 2: Firestore Subcollection direct doc ID
            if (!encryptedPayload && user && targetId) {
                try {
                    const subDoc = await getDoc(doc(db, 'users', user.uid, 'backups', targetId));
                    if (subDoc.exists()) {
                        encryptedPayload = extractEncryptedPayload(subDoc.data());
                    }
                } catch(subErr) {
                    console.warn("[Sync] Subcollection getDoc notice:", subErr);
                }
            }

            // Step 3: Scan Firestore Subcollection docs
            if (!encryptedPayload && user) {
                try {
                    const subSnap = await getDocs(collection(db, 'users', user.uid, 'backups'));
                    subSnap.forEach(d => {
                        if (encryptedPayload || !d.exists()) return;
                        const dData = d.data() || {};
                        if (
                            d.id === targetId ||
                            dData.id === targetId ||
                            (targetCreatedAt && dData.createdAt === targetCreatedAt) ||
                            (targetLabel && dData.label === targetLabel)
                        ) {
                            const found = extractEncryptedPayload(dData) || extractEncryptedPayload({ ...dData, id: d.id });
                            if (found) encryptedPayload = found;
                        }
                    });
                } catch(allSubErr) {
                    console.warn("[Sync] Subcollection scan notice:", allSubErr);
                }
            }

            // Step 4: Check Firestore Root Document
            if (!encryptedPayload && user) {
                try {
                    const rootDoc = await getDoc(doc(db, 'users', user.uid));
                    if (rootDoc.exists()) {
                        const rData = rootDoc.data() || {};
                        const candidateLists = [
                            rData.manual_backups,
                            rData.backups,
                            rData.snapshots,
                            rData.cloudBackups
                        ].filter(Array.isArray);

                        for (const list of candidateLists) {
                            if (encryptedPayload) break;
                            for (const item of list) {
                                if (!item) continue;
                                if (
                                    (targetId && item.id === targetId) ||
                                    (targetCreatedAt && item.createdAt === targetCreatedAt) ||
                                    (targetLabel && item.label === targetLabel)
                                ) {
                                    const found = extractEncryptedPayload(item);
                                    if (found) {
                                        encryptedPayload = found;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!encryptedPayload) {
                            encryptedPayload = extractEncryptedPayload(rData.latestBackup) ||
                                               extractEncryptedPayload(rData.backupPayload) ||
                                               extractEncryptedPayload(rData.backup);
                        }
                    }
                } catch(rootErr) {
                    console.warn("[Sync] Root doc backup search notice:", rootErr);
                }
            }

            // Step 5: Check Local Storage
            if (!encryptedPayload) {
                const localKeys = [
                    'qbrowse_local_backups',
                    'qbrowse_backups',
                    'qbrowse_manual_backups',
                    'qbrowse_snapshots'
                ];

                for (const key of localKeys) {
                    if (encryptedPayload) break;
                    try {
                        const raw = localStorage.getItem(key);
                        if (!raw) continue;
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) {
                            for (const item of parsed) {
                                if (!item) continue;
                                if (
                                    (targetId && item.id === targetId) ||
                                    (targetCreatedAt && item.createdAt === targetCreatedAt) ||
                                    (targetLabel && item.label === targetLabel)
                                ) {
                                    const found = extractEncryptedPayload(item);
                                    if (found) {
                                        encryptedPayload = found;
                                        break;
                                    }
                                }
                            }
                        } else if (typeof parsed === 'object') {
                            const found = extractEncryptedPayload(parsed);
                            if (found) encryptedPayload = found;
                        }
                    } catch (_) {}
                }
            }

            // Step 6: Check individual localStorage backup keys
            if (!encryptedPayload && targetId) {
                try {
                    const individualKeys = [
                        `qbrowse_backup_${targetId}`,
                        `qbrowse_snapshot_${targetId}`,
                        `qbrowse_backup_${targetId.replace(/^bk_/, '')}`
                    ];
                    for (const ik of individualKeys) {
                        const raw = localStorage.getItem(ik);
                        if (raw) {
                            const found = extractEncryptedPayload(JSON.parse(raw));
                            if (found) {
                                encryptedPayload = found;
                                break;
                            }
                        }
                    }
                } catch (_) {}
            }

            // Step 7: Check IndexedDB offline backup store
            if (!encryptedPayload) {
                try {
                    const idbPayload = await getIndexedDBBackup(targetId, targetCreatedAt);
                    if (idbPayload) {
                        encryptedPayload = extractEncryptedPayload(idbPayload);
                    }
                } catch (_) {}
            }

            // Step 8: Single local backup fallback
            if (!encryptedPayload) {
                try {
                    const raw = localStorage.getItem('qbrowse_local_backups');
                    if (raw) {
                        const list = JSON.parse(raw);
                        if (Array.isArray(list) && list.length === 1) {
                            encryptedPayload = extractEncryptedPayload(list[0]);
                        }
                    }
                } catch (_) {}
            }

            if (!encryptedPayload) {
                throw new Error("Backup encrypted data not found in cloud or local cache");
            }

            // Decrypt backup payload with master key
            const decrypted = await decryptData(encryptedPayload, passToUse);
            if (!decrypted) throw new Error("Could not decrypt backup payload");

            // Cache the retrieved encrypted payload back into memory and localStorage for immediate subsequent restores
            if (targetId) {
                try {
                    const currentCloud = get().cloudBackups || [];
                    const updatedCloud = currentCloud.map(b => (b.id === targetId ? { ...b, encrypted: encryptedPayload } : b));
                    set({ cloudBackups: updatedCloud });

                    const localB = JSON.parse(localStorage.getItem('qbrowse_local_backups') || '[]');
                    const updatedLocal = localB.map(b => (b.id === targetId ? { ...b, encrypted: encryptedPayload } : b));
                    if (!updatedLocal.some(b => b.id === targetId)) {
                        updatedLocal.unshift({
                            id: targetId,
                            label: targetLabel || 'Snapshot',
                            createdAt: targetCreatedAt || new Date().toISOString(),
                            encrypted: encryptedPayload
                        });
                    }
                    localStorage.setItem('qbrowse_local_backups', JSON.stringify(updatedLocal.slice(0, 8)));
                    saveIndexedDBBackup({
                        id: targetId,
                        label: targetLabel || 'Snapshot',
                        createdAt: targetCreatedAt || new Date().toISOString(),
                        encrypted: encryptedPayload
                    }).catch(() => {});
                } catch (_) {}
            }

            // Normalize payload root across schema versions (e.g. 1.2.x, 1.3.x, wrapped payload)
            const payloadRoot = decrypted.payload || decrypted.data || decrypted;
            await applySnapshotPayload(get, payloadRoot, passToUse);

            // Trigger debounced cloud sync to broadcast the restored state
            get().triggerDebouncedSync(1500);

            const displayLabel = backupItem.label || backupItem.name || 'Snapshot';
            useUIStore.getState().showToast(`Successfully restored "${displayLabel}"!`);
            set({ isRestoringBackup: false, restoringBackupId: null });
            return true;
        } catch(e) {
            console.error("[Sync] restoreCloudBackup error:", e);
            set({ isRestoringBackup: false, restoringBackupId: null });
            useUIStore.getState().showToast(`Restore failed: ${e.message}`);
            return false;
        }
    },

    // Delete a cloud backup
    deleteCloudBackup: async (backupId) => {
        const { user, cloudBackups } = get();
        if (!backupId) return;
        try {
            const nextBackups = cloudBackups.filter(b => b.id !== backupId);
            set({ cloudBackups: nextBackups });

            try {
                const localBackups = JSON.parse(localStorage.getItem('qbrowse_local_backups') || '[]');
                const nextLocal = localBackups.filter(b => b.id !== backupId);
                localStorage.setItem('qbrowse_local_backups', JSON.stringify(nextLocal));
            } catch(e) {}

            try {
                localStorage.removeItem(`qbrowse_backup_${backupId}`);
            } catch (_) {}

            try {
                await deleteIndexedDBBackup(backupId);
            } catch (_) {}

            if (user) {
                try {
                    const rootRef = doc(db, 'users', user.uid);
                    const remainingRoot = nextBackups.slice(0, 5).map((b, idx) => {
                        const enc = extractEncryptedPayload(b);
                        if (enc && idx < 2) {
                            return { ...b, encrypted: enc };
                        }
                        return {
                            id: b.id,
                            label: b.label || 'Snapshot',
                            createdAt: b.createdAt,
                            stats: b.stats || {}
                        };
                    });
                    await setDoc(rootRef, { manual_backups: remainingRoot }, { merge: true });
                } catch(e) {}

                try {
                    await deleteDoc(doc(db, 'users', user.uid, 'backups', backupId));
                } catch(e) {}
            }

            useUIStore.getState().showToast("Backup deleted");
        } catch(e) {
            console.error("[Sync] deleteCloudBackup error:", e);
        }
    },

    // Cross-Device Remote Tabs Refresh
    refreshCloudTabs: async (showToastNotice = true) => {
        const { user, masterPassword } = get();
        if (!user || !masterPassword) {
            if (showToastNotice) useUIStore.getState().showToast("Sign in to sync remote tabs");
            return;
        }

        try {
            set({ isRefreshingTabs: true });
            const rootRef = doc(db, 'users', user.uid);
            const snap = await getDoc(rootRef);
            if (!snap.exists()) {
                set({ isRefreshingTabs: false });
                return;
            }
            const data = snap.data();
            const currentDeviceId = getOrCreateDeviceId();
            const remoteDevices = await parseRemoteDevicesFromSnapshot(data, masterPassword, currentDeviceId);

            set({ remoteDeviceTabs: remoteDevices, isRefreshingTabs: false });

            // Mirror to useTabStore cloudTabs for backward compatibility
            const aggregatedPrivate = [];
            const aggregatedWork = [];
            const aggregatedCustom = {};
            remoteDevices.forEach(dev => {
                (dev.tabs || []).forEach(t => {
                    if (t.spaceId === 'work') aggregatedWork.push(t);
                    else if (t.spaceId && t.spaceId !== 'personal') {
                        if (!aggregatedCustom[t.spaceId]) aggregatedCustom[t.spaceId] = [];
                        aggregatedCustom[t.spaceId].push(t);
                    } else {
                        aggregatedPrivate.push(t);
                    }
                });
            });
            useTabStore.getState().setCloudTabs({
                privateTabs: aggregatedPrivate,
                workTabs: aggregatedWork,
                customSpaceTabs: aggregatedCustom
            });

            if (showToastNotice) {
                const count = remoteDevices.reduce((acc, d) => acc + (d.tabs?.length || 0), 0);
                useUIStore.getState().showToast(`Cloud tabs refreshed (${count} tabs from ${remoteDevices.length} device${remoteDevices.length === 1 ? '' : 's'})`);
            }
        } catch (e) {
            console.warn('[Sync] refreshCloudTabs notice:', e);
            set({ isRefreshingTabs: false });
        }
    },

    // Offline / Local File Backup Export
    exportLocalBackup: async () => {
        const { masterPassword } = get();
        let passToUse = masterPassword;
        if (!passToUse) {
            try { passToUse = await loadWrappedPassphrase(); } catch (_) {}
        }
        if (!passToUse) passToUse = 'qbrowse_local';
        const vaultPass = masterPassword || useVaultStore.getState().masterPassword || (passToUse !== 'qbrowse_local' ? passToUse : '');
        try {
            const uiState = useUIStore.getState();
            const cleanSettings = { ...uiState.settings };
            delete cleanSettings.syncedCloudSettings;
            if (cleanSettings.customWallpaperSource !== 'url') {
                delete cleanSettings.customWallpaper;
                delete cleanSettings.customWallpaperOriginalUrl;
            } else if (cleanSettings.customWallpaperOriginalUrl) {
                cleanSettings.customWallpaper = cleanSettings.customWallpaperOriginalUrl;
            }
            cleanSettings._syncActivePresetId = uiState.activePresetId || 'default';
            cleanSettings._syncActivePreset = cleanSettings._syncActivePresetId;
            cleanSettings._syncCustomPresets = uiState.customPresets || [];
            cleanSettings._syncPresetOverrides = uiState.presetOverrides || {};
            cleanSettings._syncTheme = uiState.theme || 'dark';
            cleanSettings._syncAccentColor = uiState.accentColor || '#d4bc94';

            const tabState = useTabStore.getState();
            const cleanCustomSpaceTabs = {};
            Object.entries(tabState.customSpaceTabs || {}).forEach(([sId, list]) => {
                const filtered = (list || []).filter(isValidSyncTab).map(t => ({ ...t, title: getCleanTabTitle(t) }));
                if (filtered.length > 0) cleanCustomSpaceTabs[sId] = filtered;
            });

            const payload = {
                app: "QBrowse",
                version: "1.3.5",
                exportedAt: new Date().toISOString(),
                settings: cleanSettings,
                vault: (await readLocalVaultForBackup(vaultPass)).filter(item => item && !isRawCiphertextString(item.password)),
                tabs: {
                    privateTabs: (tabState.privateTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    workTabs: (tabState.workTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    customSpaceTabs: cleanCustomSpaceTabs,
                    customSpaces: getEffectiveCustomSpaces(uiState, tabState),
                    spaceOrder: getEffectiveSpaceOrder(uiState, tabState)
                },
                history: (useHistoryStore.getState().history || []).slice(0, 300),
                pinnedTabs: tabState.pinnedTabs || []
            };
            const encrypted = await encryptData(payload, passToUse);
            const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qbrowse_backup_${new Date().toISOString().slice(0, 10)}.qsync`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            useUIStore.getState().showToast("Encrypted backup exported to file (.qsync)");
        } catch(e) {
            console.error("Export backup error:", e);
            useUIStore.getState().showToast("Export failed: " + e.message);
        }
    },

    // Offline / Local File Backup Import
    importLocalBackup: async (fileJsonStr, passphrase) => {
        const { masterPassword } = get();
        const candidatePasses = [];
        if (passphrase) {
            candidatePasses.push(passphrase);
        } else {
            if (masterPassword) candidatePasses.push(masterPassword);
            try {
                const wrapped = await loadWrappedPassphrase();
                if (wrapped && !candidatePasses.includes(wrapped)) candidatePasses.push(wrapped);
            } catch (_) {}
            try {
                const vaultMp = useVaultStore.getState().masterPassword;
                if (vaultMp && !candidatePasses.includes(vaultMp)) candidatePasses.push(vaultMp);
            } catch (_) {}
            if (!candidatePasses.includes('qbrowse_local')) candidatePasses.push('qbrowse_local');
        }

        try {
            const parsedObj = JSON.parse(fileJsonStr);
            const encryptedPayload = extractEncryptedPayload(parsedObj) || parsedObj;
            let data = null;
            let usedPass = candidatePasses[0] || 'qbrowse_local';
            let lastDecryptErr = null;
            for (const candidate of candidatePasses) {
                try {
                    data = await decryptData(encryptedPayload, candidate);
                    usedPass = candidate;
                    break;
                } catch (decErr) {
                    lastDecryptErr = decErr;
                }
            }
            if (!data) throw lastDecryptErr || new Error("Invalid format");

            const payloadRoot = data.payload || data.data || data;
            await applySnapshotPayload(get, payloadRoot, usedPass);

            useUIStore.getState().showToast("Backup imported successfully!");
            get().triggerDebouncedSync(1500);
            return true;
        } catch(e) {
            console.error("Import backup error:", e);
            useUIStore.getState().showToast("Import failed: check password or file format");
            return false;
        }
    },

    listenToCloudSync: () => {
        const { user, masterPassword, syncCategories } = get();
        if (!user || !masterPassword) return;

        get().stopListening();

        // 1. Single Root User Document Listener (Handles standard match /users/{userId} rule!)
        const rootDocRef = doc(db, 'users', user.uid);
        const unsubRoot = onSnapshot(rootDocRef, async (docSnap) => {
            if (!docSnap.exists()) return;
            const data = docSnap.data();
            const currentDeviceId = getOrCreateDeviceId();

            // Skip self-echo snapshots produced by our own recent write ONLY after initial cloud snapshot & for our device
            if (
                hasAppliedInitialCloudSnapshot &&
                data.lastSync &&
                lastLocalWriteIso &&
                data.lastSync === lastLocalWriteIso &&
                (!data.lastSyncDeviceId || data.lastSyncDeviceId === currentDeviceId)
            ) {
                return;
            }

            beginRemoteApply();
            try {
                // Handle manual backups update (preserve any in-memory encrypted payload & computed stats references)
                if (Array.isArray(data.manual_backups)) {
                    const currentBackups = get().cloudBackups || [];
                    const merged = data.manual_backups.map(mb => {
                        const existing = currentBackups.find(b => b.id === mb.id);
                        const existingEnc = existing ? extractEncryptedPayload(existing) : null;
                        const mbEnc = extractEncryptedPayload(mb);
                        const resolvedEnc = mbEnc || existingEnc;
                        const resolvedStats = (mb.stats && typeof mb.stats.passwords === 'number' && mb.stats.passwords > 0)
                            ? mb.stats
                            : ((existing?.stats && typeof existing.stats.passwords === 'number' && existing.stats.passwords > 0) ? existing.stats : (mb.stats || existing?.stats));
                        return {
                            ...mb,
                            ...(resolvedEnc ? { encrypted: resolvedEnc } : {}),
                            ...(resolvedStats ? { stats: resolvedStats } : {})
                        };
                    });
                    for (const cb of currentBackups) {
                        if (!merged.some(m => m.id === cb.id)) {
                            merged.push(cb);
                        }
                    }
                    merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                    set({ cloudBackups: merged });
                }

                // Sync Settings & Presets with Last-Write-Wins & Union Merge
                let remoteDecryptedSettings = null;
                let remoteSettingsUpdatedAtMs = 0;
                const localSettingsUpdatedAt = parseTimestampMs((() => {
                    try { return localStorage.getItem(SETTINGS_UPDATED_AT_KEY); } catch (_) { return ''; }
                })());

                if (syncCategories?.settings !== false && data.settings?.encrypted) {
                    try {
                        remoteSettingsUpdatedAtMs = parseTimestampMs(data.settings?.updatedAt);
                        remoteDecryptedSettings = await decryptData(data.settings.encrypted, masterPassword);
                        if (remoteDecryptedSettings && typeof remoteDecryptedSettings === 'object') {
                            if (!localSettingsDirty && (remoteSettingsUpdatedAtMs >= localSettingsUpdatedAt || localSettingsUpdatedAt === 0)) {
                                applyRemoteSettingsToUIStore(remoteDecryptedSettings, remoteSettingsUpdatedAtMs);
                                lastSyncedSignatures.settings = JSON.stringify(remoteDecryptedSettings);
                            }
                        }
                    } catch(e) {}
                }

                let remotePresetsPayload = null;
                if (syncCategories?.settings !== false && data.presets?.encrypted) {
                    try {
                        remotePresetsPayload = await decryptData(data.presets.encrypted, masterPassword);
                    } catch(e) {}
                }

                if (syncCategories?.settings !== false && (remotePresetsPayload || remoteDecryptedSettings)) {
                    try {
                        const uiStoreState = useUIStore.getState();
                        const localPresetsUpdatedAt = parseTimestampMs((() => {
                            try { return localStorage.getItem(PRESETS_UPDATED_AT_KEY); } catch (_) { return ''; }
                        })());
                        const remotePresetsUpdatedAtMs = parseTimestampMs(data.presets?.updatedAt) || remoteSettingsUpdatedAtMs;
                        const remoteCustomPresets = Array.isArray(remotePresetsPayload?.customPresets)
                            ? remotePresetsPayload.customPresets
                            : (Array.isArray(remoteDecryptedSettings?._syncCustomPresets) ? remoteDecryptedSettings._syncCustomPresets : []);
                        const remoteOverrides = (remotePresetsPayload?.presetOverrides && typeof remotePresetsPayload.presetOverrides === 'object')
                            ? remotePresetsPayload.presetOverrides
                            : ((remoteDecryptedSettings?._syncPresetOverrides && typeof remoteDecryptedSettings._syncPresetOverrides === 'object') ? remoteDecryptedSettings._syncPresetOverrides : {});
                        const remoteActivePresetId = remotePresetsPayload?.activePresetId
                            || remoteDecryptedSettings?._syncActivePresetId
                            || remoteDecryptedSettings?._syncActivePreset
                            || '';
                        const remoteDeletedPresetIds = remotePresetsPayload?.deletedPresetIds
                            || remoteDecryptedSettings?._syncDeletedPresetIds
                            || null;

                        const mergedPresets = mergePresetsAndOverrides({
                            localCustomPresets: uiStoreState.customPresets || [],
                            remoteCustomPresets,
                            localOverrides: uiStoreState.presetOverrides || {},
                            remoteOverrides,
                            localActivePresetId: uiStoreState.activePresetId || uiStoreState.activePreset || 'default',
                            remoteActivePresetId,
                            remoteDeletedPresetIds,
                            remotePresetsUpdatedAtMs,
                            localPresetsUpdatedAtMs: localPresetsUpdatedAt,
                            localPresetsDirty
                        });
                        applyRemotePresetsToUIStore(mergedPresets, remotePresetsUpdatedAtMs, {
                            adoptRemoteTimestamp: remotePresetsUpdatedAtMs > localPresetsUpdatedAt && !localPresetsDirty
                        });
                    } catch(e) {}
                }

                // Sync Vault (including deletion tombstones)
                if (syncCategories?.vault !== false && (data.vault?.encrypted || data.vaultDeletedIds?.encrypted)) {
                    try {
                        const remoteVault = data.vault?.encrypted
                            ? await decryptData(data.vault.encrypted, masterPassword)
                            : [];
                        const remoteTombstones = data.vaultDeletedIds?.encrypted
                            ? await decryptData(data.vaultDeletedIds.encrypted, masterPassword)
                            : null;
                        if (Array.isArray(remoteVault) || remoteVault?.items || remoteTombstones) {
                            await get().mergeRemoteVault(remoteVault || [], masterPassword, remoteTombstones);
                        }
                    } catch(e) {}
                }

                // Sync Cross-Device Remote Tabs, Custom Spaces, Space Order & Pinned Apps
                if (syncCategories?.tabs !== false) {
                    try {
                        const remoteDevices = await parseRemoteDevicesFromSnapshot(data, masterPassword, currentDeviceId);
                        set({ remoteDeviceTabs: remoteDevices });

                        // Mirror to useTabStore cloudTabs for backward compatibility
                        const aggregatedPrivate = [];
                        const aggregatedWork = [];
                        const aggregatedCustom = {};
                        remoteDevices.forEach(dev => {
                            (dev.tabs || []).forEach(t => {
                                if (t.spaceId === 'work') aggregatedWork.push(t);
                                else if (t.spaceId && t.spaceId !== 'personal') {
                                    if (!aggregatedCustom[t.spaceId]) aggregatedCustom[t.spaceId] = [];
                                    aggregatedCustom[t.spaceId].push(t);
                                } else {
                                    aggregatedPrivate.push(t);
                                }
                            });
                        });
                        useTabStore.getState().setCloudTabs({
                            privateTabs: aggregatedPrivate,
                            workTabs: aggregatedWork,
                            customSpaceTabs: aggregatedCustom
                        });

                        let tabsData = null;
                        if (data.tabs?.encrypted) {
                            try {
                                tabsData = await decryptData(data.tabs.encrypted, masterPassword);
                            } catch (_) {}
                        }

                        let resolvedPinned = undefined;
                        if (data.pinnedTabs?.encrypted) {
                            try {
                                const decPinned = await decryptData(data.pinnedTabs.encrypted, masterPassword);
                                if (Array.isArray(decPinned)) {
                                    resolvedPinned = decPinned;
                                }
                            } catch (_) {}
                        }
                        if (resolvedPinned === undefined && tabsData && Array.isArray(tabsData.pinnedTabs)) {
                            resolvedPinned = tabsData.pinnedTabs;
                        }

                        const remoteTabsUpdatedAtMs = Math.max(
                            parseTimestampMs(data.tabs?.updatedAt),
                            parseTimestampMs(data.pinnedTabs?.updatedAt)
                        );
                        const localTabsUpdatedAt = parseTimestampMs((() => {
                            try { return localStorage.getItem(TABS_UPDATED_AT_KEY); } catch (_) { return ''; }
                        })());

                        if (!localTabsDirty && (remoteTabsUpdatedAtMs >= localTabsUpdatedAt || localTabsUpdatedAt === 0)) {
                            if (tabsData || Array.isArray(resolvedPinned)) {
                                applyRemoteTabsMetaToStores(tabsData, {
                                    pinnedTabsOverride: resolvedPinned,
                                    remoteTabsUpdatedAtMs,
                                    adoptRemoteTimestamp: remoteTabsUpdatedAtMs > 0
                                });
                                if (Array.isArray(resolvedPinned)) {
                                    lastSyncedSignatures.pinnedTabs = JSON.stringify(resolvedPinned);
                                }
                            }
                        }
                    } catch(e) {
                        console.warn('[Sync] Notice processing remote tabs in snapshot:', e);
                    }
                }

                // Sync History
                if (syncCategories?.history !== false && data.history?.encrypted) {
                    try {
                        const remoteHistory = await decryptData(data.history.encrypted, masterPassword);
                        if (Array.isArray(remoteHistory)) {
                            useHistoryStore.getState().mergeRemoteHistory(normalizeRemoteHistoryItems(remoteHistory));
                        }
                    } catch(e) {}
                }

                hasAppliedInitialCloudSnapshot = true;

                // Update local watcher signatures so incoming cloud changes never echo back a sync
                refreshObservedWatcherSignatures();

                set({ syncStatus: 'synced', authError: null });
            } finally {
                endRemoteApply(2000);
            }
        }, (err) => {
            console.warn("[Sync] Root user listener notice:", err.message);
            set({ syncStatus: 'offline', authError: null });
        });

        unsubscribeCloudListeners.push(unsubRoot);
    },

    serializeCurrentProfileSync: (profileId) => {
        try {
            const syncKey = (!profileId || profileId === 'default') ? 'qbrowse_last_sync' : `qbrowse_last_sync_${profileId}`;
            const catKey = (!profileId || profileId === 'default') ? 'qbrowse_sync_categories' : `qbrowse_sync_categories_${profileId}`;

            if (get().masterPassword) {
                saveWrappedPassphrase(get().masterPassword);
            }
            if (get().lastSyncTime) localStorage.setItem(syncKey, get().lastSyncTime);
            localStorage.setItem(catKey, JSON.stringify(get().syncCategories));
        } catch (e) {
            console.error('Failed to serialize profile sync data', e);
        }
    },

    loadProfileSync: async (profileId) => {
        try {
            const syncKey = (!profileId || profileId === 'default') ? 'qbrowse_last_sync' : `qbrowse_last_sync_${profileId}`;
            const catKey = (!profileId || profileId === 'default') ? 'qbrowse_sync_categories' : `qbrowse_sync_categories_${profileId}`;

            hasSyncedThisSession = false;
            sessionSyncedUid = '';
            hasAppliedInitialCloudSnapshot = false;
            localSettingsDirty = false;
            localTabsDirty = false;
            localPresetsDirty = false;
            lastObservedVaultMap = new Map();

            const masterPass = await loadWrappedPassphrase();
            const lastSync = localStorage.getItem(syncKey) || null;
            let cats = { vault: true, settings: true, tabs: true, history: true };
            try {
                const storedCats = localStorage.getItem(catKey);
                if (storedCats) cats = JSON.parse(storedCats);
            } catch(e) {}

            set({
                masterPassword: masterPass,
                lastSyncTime: lastSync,
                syncCategories: cats,
                cloudBackups: [],
                isLoadingBackups: false
            });

            if (typeof window !== 'undefined' && window.__vaultStore) {
                try { await window.__vaultStore.getState().syncVaultStatus?.(); } catch (_) {}
            }

            // If user is authenticated, refresh cloud backups and listener for this profile
            if (get().user) {
                get().stopListening();
                setTimeout(() => {
                    get().listenToCloudSync();
                    get().fetchCloudBackups();
                }, 50);
            }
        } catch (e) {
            console.error('Failed to load profile sync data', e);
        }
    }
}));

// Initialize Firebase auth observer and arm startup store watchers safely
useSyncStore.getState().initAuth();
setupLocalStoreWatchers();

if (typeof window !== 'undefined') {
    window.__syncStore = useSyncStore;
}

export default useSyncStore;
