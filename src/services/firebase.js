import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDu_D0vvUBW_cuqpsq5TfikEEHuULVCA04",
  authDomain: "qbrowse-74811.firebaseapp.com",
  projectId: "qbrowse-74811",
  storageBucket: "qbrowse-74811.firebasestorage.app",
  messagingSenderId: "759108432615",
  appId: "1:759108432615:web:2810fdbda18df0b6192842",
  measurementId: "G-PGWKKGCK1N"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
