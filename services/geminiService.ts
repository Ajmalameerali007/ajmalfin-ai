import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Transaction, AiParsedTransaction, MainCategory, AiChatCompletion, Budget } from '../types';
import { MAIN_CATEGORIES, SUGGESTED_EXPENSE_TAGS, SUGGESTED_INCOME_TAGS } from '../constants';
import { db } from "../firebase";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

const parseJsonResponse = <T,>(text: string): T | null => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
};

export const getAiChatResponse = async (
  userInput: string,
  recentTransactions: Transaction[],
  budgets: Budget[],
  base64Image?: string,
  mimeType?: string
): Promise<AiChatCompletion | null> => {
  const systemInstruction = `
    You are AjmalFin AI, a playful, sharp, and helpful financial assistant.
    Read the user's input (text or image) and extract transaction data.

    CONTEXT:
    - Categories: ${MAIN_CATEGORIES.join(', ')}.
    - Income tags: ${JSON.stringify(SUGGESTED_INCOME_TAGS)}
    - Expense tags: ${JSON.stringify(SUGGESTED_EXPENSE_TAGS)}
    - Recent transactions: ${JSON.stringify(recentTransactions.slice(0, 10))}
    - Budgets: ${JSON.stringify(budgets)}
    - Date: ${new Date().toISOString().split("T")[0]}

    OUTPUT:
    - If unclear: { "type": "chat", "message": "Ask user", "transactions": null }
    - If valid: {
        "type": "confirmation",
        "message": "Summary of what will be logged",
        "transactions": [
          {
            "amount": 123.45,
            "type": "expense",
            "mainCategory": "Personal",
            "subCategory": "Shopping",
            "payee": "Lulu",
            "date": "YYYY-MM-DD",
            "medium": "card",
            "notes": "optional"
          }
        ]
      }
  `;

  const contents = [];

  if (base64Image && mimeType) {
    contents.push({ inlineData: { data: base64Image, mimeType } });
  }

  contents.push({ text: userInput });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: { parts: contents },
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const parsed = parseJsonResponse<AiChatCompletion>(response.text);

    if (!parsed) {
      return { type: "error", message: "Couldn't understand. Try again?", transactions: null };
    }

    if (parsed.type === 'confirmation' && parsed.transactions) {
      parsed.transactions.forEach(tx => {
        if (!MAIN_CATEGORIES.includes(tx.mainCategory)) {
          tx.notes = (tx.notes || '') + ` | original category: ${tx.mainCategory}`;
          tx.mainCategory = 'Personal';
        }
      });
    }

    return parsed;
  } catch (error) {
    console.error("AI error:", error);
    return { type: "error", message: "Gemini failed to respond.", transactions: null };
  }
};

export const processBulkFiles = async (
  fileData: { name: string; type: 'csv' | 'image' | 'pdf'; content: string }[],
  recentTransactions: Transaction[]
): Promise<AiParsedTransaction[]> => {
  const allParsedTransactions: AiParsedTransaction[] = [];

  const imagePdfPrompt = `
    You are an AI assistant that extracts transaction data from uploaded documents like receipts, statements, or reports.

    RULES:
    1. Read the file and extract valid transactions (amount, date, category, payee).
    2. Guess category and subcategory using the provided MAIN_CATEGORIES: ${MAIN_CATEGORIES.join(', ')}.
    3. If you cannot extract any valid transaction, return: []

    Output MUST be a strict JSON array like:
    [
      {
        "amount": 35.00,
        "type": "expense",
        "mainCategory": "Personal",
        "subCategory": "Dining",
        "payee": "Starbucks",
        "date": "2025-07-03",
        "medium": "card",
        "notes": "From uploaded image"
      }
    ]
  `;

  for (const file of fileData) {
    const contents = [];
    const mimeType = file.type === 'pdf' ? 'application/pdf' : `image/${file.name.split('.').pop()}`;

    contents.push({ inlineData: { data: file.content, mimeType } });
    contents.push({ text: imagePdfPrompt });

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: { parts: contents },
        config: { responseMimeType: "application/json" },
      });

      const parsed = parseJsonResponse<AiParsedTransaction[]>(response.text);

      if (parsed && Array.isArray(parsed)) {
        parsed.forEach(tx => {
          if (!tx.mainCategory || !MAIN_CATEGORIES.includes(tx.mainCategory)) {
            tx.mainCategory = "Personal";
            tx.notes = (tx.notes || "") + " | category auto-corrected";
          }
          tx.sourceFile = file.name;
          tx.status = 'new';
          allParsedTransactions.push(tx);
        });
      }
    } catch (err) {
      console.error(`❌ AI failed to process file ${file.name}`, err);
    }
  }

  return allParsedTransactions;
};

export const getAIInsights = async (transactions: Transaction[]): Promise<string | null> => {
  if (transactions.length < 5) {
    return "Not enough data for insights. Please add more transactions.";
  }

  const sanitized = transactions.map(t => ({
    amount: t.amount,
    type: t.type,
    mainCategory: t.mainCategory,
    subCategory: t.subCategory,
    date: t.date
  }));

  const prompt = `
    You are a financial assistant. Based on this transaction history, give 3 helpful insights.
    ${JSON.stringify(sanitized, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt
    });

    return response.text;
  } catch (err) {
    console.error("AI insight generation failed:", err);
    return null;
  }
};