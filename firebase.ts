

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

// --- User's Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCZbqEjvI66AWimpNybxWrc1Ib-o1K7oQk",
  authDomain: "ajmalfin-ai.firebaseapp.com",
  databaseURL: "https://ajmalfin-ai-default-rtdb.firebaseio.com",
  projectId: "ajmalfin-ai",
  storageBucket: "ajmalfin-ai.appspot.com",
  messagingSenderId: "63571800461",
  appId: "1:63571800461:web:c208ca771829c575d90dc4",
  measurementId: "G-VE65GDT4GJ"
};
// ------------------------------------

// A simple and correct check to see if a real configuration has been provided.
// Firebase web API keys start with "AIzaSy".
export const isFirebaseConfigured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AIzaSy");

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Initialize Firebase safely only if configured, so the app can run without it.
if (isFirebaseConfigured) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        // Use initializeFirestore with long polling to improve connection stability on restrictive networks.
        db = initializeFirestore(app, {
            experimentalForceLongPolling: true,
        });
    } catch (e) {
        console.error("Firebase initialization failed. The app may not connect to the cloud.", e);
    }
}

export { app, auth, db };