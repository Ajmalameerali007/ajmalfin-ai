import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export const loadAllTransactions = async () => {
  try {
    const snapshot = await getDocs(collection(db, "transactions"));
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return transactions;
  } catch (error) {
    console.error("Error loading transactions from Firestore:", error);
    return [];
  }
};
