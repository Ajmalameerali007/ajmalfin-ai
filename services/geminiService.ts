import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import {
  Transaction,
  AiParsedTransaction,
  MainCategory,
  AiChatCompletion,
  Budget,
} from "../types";
import {
  MAIN_CATEGORIES,
  SUGGESTED_EXPENSE_TAGS,
  SUGGESTED_INCOME_TAGS,
} from "../constants";

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const parseJsonResponse = <T,>(text: string): T | null => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Original text:", text);
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
    You are AjmalFin AI, a playful, sharp, and super-helpful financial sidekick! Your mission is to make logging finances fast and conversational.
    Analyze the user's input (text or image) to identify transaction details. Your primary goal is to gather enough information to form a complete transaction.
    CONTEXT:
    - Main Categories: ${MAIN_CATEGORIES.join(", ")}.
    - Suggested Tags: Income: ${JSON.stringify(SUGGESTED_INCOME_TAGS)}, Expenses: ${JSON.stringify(SUGGESTED_EXPENSE_TAGS)}.
    - User's recent transactions: ${JSON.stringify(recentTransactions.slice(0, 10))}
    - User's budgets: ${JSON.stringify(budgets)}
    - Today's Date: ${new Date().toLocaleDateString("en-CA")}.

    OUTPUT FORMAT (always JSON only):
    - Asking a question:
      { "type": "chat", "message": "question", "transactions": null }
    - Single transaction:
      { "type": "confirmation", "message": "summary", "transactions": [ { ... } ] }
    - Multiple transactions:
      { "type": "confirmation", "message": "summary", "transactions": [ {...}, {...} ] }
    - If invalid:
      { "type": "error", "message": "error message", "transactions": null }
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
        responseMimeType: "application/json",
      },
    });

    console.log("Gemini raw response:", response.text);

    const parsed = parseJsonResponse<AiChatCompletion>(response.text);
    if (!parsed) {
      return {
        type: "error",
        message: "Sorry, I had trouble understanding that. Could you rephrase?",
        transactions: null,
      };
    }

    if (parsed.type === "confirmation" && parsed.transactions) {
      parsed.transactions.forEach((tx) => {
        if (tx.mainCategory && !MAIN_CATEGORIES.includes(tx.mainCategory)) {
          tx.notes = (tx.notes || "") + ` | Original category: ${tx.mainCategory}.`;
          tx.mainCategory = "Personal";
        }
      });
    }

    return parsed;
  } catch (error) {
    console.error("Error getting AI Chat response:", error);
    return {
      type: "error",
      message: "I'm having trouble connecting to my brain right now. Please try again.",
      transactions: null,
    };
  }
};

export const processBulkFiles = async (
  fileData: { name: string; type: "csv" | "image" | "pdf"; content: string }[],
  recentTransactions: Transaction[]
): Promise<AiParsedTransaction[]> => {
  const allParsedTransactions: AiParsedTransaction[] = [];

  const imagePdfPrompt = `
    You are an expert at extracting financial data from documents. The user has uploaded an image or PDF of a receipt or statement. Extract all transaction details.
    CONTEXT:
    - User's recent transactions: ${JSON.stringify(recentTransactions.slice(0, 20))}
    - Available Main Categories: ${MAIN_CATEGORIES.join(", ")}.
    OUTPUT FORMAT: Always a valid JSON array of transactions. Never include anything outside it.
  `;

  const csvPrompt = `
    You are an expert at parsing financial data from CSV files. Convert each row into a JSON transaction.
    CONTEXT:
    - User's recent transactions: ${JSON.stringify(recentTransactions.slice(0, 20))}
    - Available Main Categories: ${MAIN_CATEGORIES.join(", ")}.
    CSV Content:
    --- {csvText} ---
    OUTPUT FORMAT: JSON array of transaction objects. Example:
    [{ "amount": 100, "type": "expense", "mainCategory": "Personal", "subCategory": "Groceries", "payee": "Lulu", "date": "2025-07-01", "notes": "From CSV" }]
  `;

  for (const file of fileData) {
    let prompt = "";
    const contents = [];

    if (file.type === "csv") {
      prompt = csvPrompt.replace("{csvText}", file.content);
      contents.push({ text: prompt });
    } else {
      prompt = imagePdfPrompt;
      const mimeType = file.type === "pdf" ? "application/pdf" : `image/${file.name.split(".").pop()}`;
      contents.push({ inlineData: { data: file.content, mimeType } });
      contents.push({ text: "Extract transactions from this document." });
    }

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: { parts: contents },
        config: {
          ...(file.type === "csv" && { systemInstruction: prompt }),
          responseMimeType: "application/json",
        },
      });

      console.log("Gemini raw response:", response.text);

      const parsed = parseJsonResponse<AiParsedTransaction[]>(response.text);
      if (parsed && Array.isArray(parsed)) {
        parsed.forEach((tx) => {
          if (tx.amount && tx.type && tx.date) {
            tx.sourceFile = file.name;
            tx.status = "new";

            const isDuplicate = recentTransactions.some((existingTx) => {
              return (
                existingTx.amount === tx.amount &&
                new Date(existingTx.date).toDateString() === new Date(tx.date!).toDateString() &&
                (existingTx.payee === tx.payee || existingTx.subCategory === tx.subCategory)
              );
            });

            if (isDuplicate) {
              tx.status = "duplicate";
            }

            if (tx.mainCategory && !MAIN_CATEGORIES.includes(tx.mainCategory)) {
              tx.notes = (tx.notes || "") + ` | Original category: ${tx.mainCategory}.`;
              tx.mainCategory = "Personal";
            }

            allParsedTransactions.push(tx);
          }
        });
      } else {
        console.warn(`Could not parse response for file ${file.name} as array.`, response.text);
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
    }
  }

  return allParsedTransactions;
};

export const getAIInsights = async (transactions: Transaction[]): Promise<string | null> => {
  if (transactions.length < 5) {
    return "Not enough data for insights. Please add more transactions.";
  }

  const sanitizedData = transactions.map(({ type, mainCategory, subCategory, amount, date }) => ({
    type,
    mainCategory,
    subCategory,
    amount,
    date,
  }));

  const prompt = `
    You are a financial analyst for a gym owner. Based on this transaction data, provide 3 short insights on trends or improvements:
    ${JSON.stringify(sanitizedData, null, 2)}
    Output only plain text.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error getting AI insights:", error);
    return "Sorry, I couldn't generate insights right now.";
  }
};