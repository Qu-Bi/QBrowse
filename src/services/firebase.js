import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder_api_key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder_api_key'
);

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let analyticsInstance = null;
if (typeof window !== 'undefined' && isFirebaseConfigured) {
  isSupported().then(supported => {
    if (supported) {
      try {
        analyticsInstance = getAnalytics(app);
      } catch (err) {
        console.warn('[Firebase] Analytics initialization skipped:', err.message);
      }
    }
  }).catch(() => {});
}

export const analytics = analyticsInstance;
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
