import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Transaction, AiParsedTransaction, MainCategory, AiChatCompletion, Budget } from '../types';
import { MAIN_CATEGORIES, SUGGESTED_EXPENSE_TAGS, SUGGESTED_INCOME_TAGS } from '../constants';

// ✅ Use Vite-style env check
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is not set. Gemini API calls will fail.");
}

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
    ...
    OUTPUT FORMAT:
    ...
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

    const parsed = parseJsonResponse<AiChatCompletion>(response.text);
    if (!parsed) {
      return {
        type: 'error',
        message: "Sorry, I had trouble understanding that. Could you rephrase?",
        transactions: null,
      };
    }

    if (parsed.type === 'confirmation' && parsed.transactions) {
      parsed.transactions.forEach(tx => {
        if (tx.mainCategory && !MAIN_CATEGORIES.includes(tx.mainCategory)) {
          tx.notes = (tx.notes || '') + ` | Original category suggestion: ${tx.mainCategory}. Please review.`;
          tx.mainCategory = 'Personal';
        }
      });
    }

    return parsed;
  } catch (error) {
    console.error("Error getting AI Chat response:", error);
    return {
      type: 'error',
      message: "I'm having trouble connecting to my brain right now. Please try again in a moment.",
      transactions: null,
    };
  }
};

export const processBulkFiles = async (
  fileData: { name: string; type: 'csv' | 'image' | 'pdf'; content: string }[],
  recentTransactions: Transaction[]
): Promise<AiParsedTransaction[]> => {
  const allParsedTransactions: AiParsedTransaction[] = [];

  const imagePdfPrompt = `...`;
  const csvPrompt = `...`;

  for (const file of fileData) {
    let prompt = '';
    const contents = [];

    if (file.type === 'csv') {
      prompt = csvPrompt.replace('{csvText}', file.content);
      contents.push({ text: prompt });
    } else {
      prompt = imagePdfPrompt;
      const mimeType = file.type === 'pdf' ? 'application/pdf' : `image/${file.name.split('.').pop()}`;
      contents.push({ inlineData: { data: file.content, mimeType } });
      contents.push({ text: "Extract transactions from this document." });
    }

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: { parts: contents },
        config: {
          ...(file.type === 'csv' && { systemInstruction: prompt }),
          responseMimeType: "application/json",
        },
      });

      const parsed = parseJsonResponse<AiParsedTransaction[]>(response.text);

      if (parsed && Array.isArray(parsed)) {
        parsed.forEach(tx => {
          if (tx.amount && tx.type && tx.date) {
            tx.sourceFile = file.name;
            tx.status = 'new';

            const isDuplicate = recentTransactions.some(existingTx =>
              existingTx.amount === tx.amount &&
              new Date(existingTx.date).toDateString() === new Date(tx.date!).toDateString() &&
              (existingTx.payee === tx.payee || existingTx.subCategory === tx.subCategory)
            );

            if (isDuplicate) {
              tx.status = 'duplicate';
            }

            if (tx.mainCategory && !MAIN_CATEGORIES.includes(tx.mainCategory)) {
              tx.notes = (tx.notes || '') + ` | Original category: ${tx.mainCategory}.`;
              tx.mainCategory = 'Personal';
            }

            allParsedTransactions.push(tx);
          }
        });
      } else {
        console.warn(`Could not parse response for file ${file.name} as an array. Response:`, response.text);
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
    type, mainCategory, subCategory, amount, date
  }));

  const prompt = `
    You are a financial analyst for a gym owner. Based on the following JSON data of recent transactions, provide 3 brief, actionable insights...
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error getting AI insights:", error);
    return "Sorry, I couldn't generate insights at this moment.";
  }
};