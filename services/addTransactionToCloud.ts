import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export const addTransactionToCloud = async ({
  amount,
  type,
  mainCategory,
  subCategory,
  payee,
  date,
  medium,
  notes,
  addedBy
}: {
  amount: number;
  type: "income" | "expense";
  mainCategory: string;
  subCategory: string;
  payee: string;
  date: string;
  medium: string;
  notes?: string;
  addedBy: "Ajmal" | "Irfad" | "Shireen";
}) => {
  try {
    await addDoc(collection(db, "transactions"), {
      amount,
      type,
      mainCategory,
      subCategory,
      payee,
      date,
      medium,
      notes: notes || "",
      addedBy,
      createdAt: Timestamp.now()
    });
    console.log("Transaction saved to cloud");
  } catch (error) {
    console.error("Error saving to Firestore:", error);
  }
};
