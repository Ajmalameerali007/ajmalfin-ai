import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDf1NJrCcYFgKMMwIGzRVzHuKCx-YYp0Vc",
  authDomain: "ajmalfin-ai.firebaseapp.com",
  databaseURL: "https://ajmalfin-ai-default-rtdb.firebaseio.com",
  projectId: "ajmalfin-ai",
  storageBucket: "ajmalfin-ai.appspot.com",
  messagingSenderId: "63571800461",
  appId: "1:63571800461:web:c208ca771829c575d90dc4",
  measurementId: "G-VE65GDT4GJ"
};

const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);

export { firebaseApp };
export const db = getFirestore(firebaseApp);