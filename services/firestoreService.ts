

import { db } from '../firebase';
import { doc, setDoc, onSnapshot, DocumentReference, DocumentData, FirestoreError } from 'firebase/firestore';
import { Transaction, Borrowing, Settings, Budget, Template } from '../types';

export interface AppData {
    transactions: Transaction[];
    borrowings: Borrowing[];
    settings: Settings;
    budgets: Budget[];
    templates: Template[];
}

const TEAM_DATA_DOC_ID = 'shared-data-v1';

// Lazily get the doc ref to avoid error on app start when not configured
const getDataDocRef = (): DocumentReference<DocumentData> | null => {
    if (!db) {
        return null;
    }
    return doc(db, 'app-data', TEAM_DATA_DOC_ID);
}

export const updateAppData = (data: Partial<AppData>) => {
    const dataDocRef = getDataDocRef();
    if (!dataDocRef) {
        return Promise.reject(new Error("Firebase is not configured."));
    }
    return setDoc(dataDocRef, data, { merge: true });
};

export const setupAppDataListener = (
    onDataReceived: (data: AppData) => void,
    onError: (error: FirestoreError) => void
) => {
    const dataDocRef = getDataDocRef();
    if (!dataDocRef) {
        // If not configured, we shouldn't try to listen.
        // We can call onDataReceived with empty data to initialize the app state.
         const defaultData: AppData = {
            transactions: [],
            borrowings: [],
            settings: { theme: 'dark', currency: 'AED', voiceEnabled: true },
            budgets: [],
            templates: [],
        };
        onDataReceived(defaultData);
        // Return a dummy unsubscribe function.
        return () => {};
    }

    const unsubscribe = onSnapshot(dataDocRef, (docSnap) => {
        if (docSnap.exists()) {
            onDataReceived(docSnap.data() as AppData);
        } else {
            console.log("No app data found in Firestore. Initializing with default structure.");
            const defaultData: AppData = {
                transactions: [],
                borrowings: [],
                settings: { theme: 'dark', currency: 'AED', voiceEnabled: true },
                budgets: [],
                templates: [],
            };
            onDataReceived(defaultData);
            updateAppData(defaultData);
        }
    }, (error: FirestoreError) => {
        if (error.code === 'unavailable') {
            // This is the expected code for being offline. Log it as info, not a scary error.
            console.info("Firestore connection unavailable. Operating in offline mode. Your data is safe.");
        } else {
            // For any other errors, log them as critical errors.
            console.error("Error listening to app data:", error);
        }
        onError(error);
    });

    return unsubscribe;
};