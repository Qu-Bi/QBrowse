import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export function resolveFirebaseConfig() {
  // 1. Check local runtime electronAPI (loaded from ~/.config/QBrowse/.env or process.env)
  let runtimeConfig = null;
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getFirebaseConfigSync) {
      runtimeConfig = window.electronAPI.getFirebaseConfigSync();
    }
  } catch (_) {}

  // 2. Check localStorage custom saved configuration
  let localConfig = null;
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('qbrowse_firebase_config');
      if (stored) localConfig = JSON.parse(stored);
    }
  } catch (_) {}

  const active = localConfig || runtimeConfig || {};

  return {
    apiKey: active.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || "placeholder_api_key",
    authDomain: active.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder.firebaseapp.com",
    projectId: active.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder-project",
    storageBucket: active.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: active.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: active.appId || import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: active.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
  };
}

const firebaseConfig = resolveFirebaseConfig();

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'placeholder_api_key' &&
  !firebaseConfig.apiKey.includes('placeholder')
);

function createAuth(app) {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    });
  } catch (_) {
    return getAuth(app);
  }
}

let appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
let authInstance = createAuth(appInstance);
let dbInstance = getFirestore(appInstance);

export function reinitializeFirebase(newConfig) {
  try {
    const existing = getApps();
    if (existing.length > 0) {
      try { deleteApp(existing[0]); } catch (_) {}
    }
    appInstance = initializeApp(newConfig);
    authInstance = createAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    return true;
  } catch (e) {
    console.error('[Firebase] Failed to reinitialize:', e);
    return false;
  }
}

let analyticsInstance = null;
if (typeof window !== 'undefined' && isFirebaseConfigured && window.location.protocol.startsWith('http')) {
  isSupported().then(supported => {
    if (supported) {
      try {
        analyticsInstance = getAnalytics(appInstance);
      } catch (err) {
        console.warn('[Firebase] Analytics initialization skipped:', err.message);
      }
    }
  }).catch(() => {});
}

export const analytics = analyticsInstance;
export { authInstance as auth, dbInstance as db, appInstance as app };
export default appInstance;
