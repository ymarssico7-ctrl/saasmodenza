import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"] || "AIzaSyCKvUHemIFY9rQLqEr7UJa2iVqY_bmuYL8",
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] || "saasmoda-a541c.firebaseapp.com",
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"] || "saasmoda-a541c",
  storageBucket:
    import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] || "saasmoda-a541c.firebasestorage.app",
  messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] || "536296159371",
  appId: import.meta.env["VITE_FIREBASE_APP_ID"] || "1:536296159371:web:01519f5999faf1a7433c8e",
};

// Initialize Firebase app singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);
