

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Transaction, AiParsedTransaction, MainCategory, AiChatCompletion, Budget } from '../types';
import { MAIN_CATEGORIES, SUGGESTED_EXPENSE_TAGS, SUGGESTED_INCOME_TAGS } from '../constants';

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
}

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
        - Main Categories: ${MAIN_CATEGORIES.join(', ')}.
        - Suggested Tags: Income: ${JSON.stringify(SUGGESTED_INCOME_TAGS)}, Expenses: ${JSON.stringify(SUGGESTED_EXPENSE_TAGS)}.
        - User's recent transactions (for context on payees, categories): ${JSON.stringify(recentTransactions.slice(0,10))}
        - User's budgets: ${JSON.stringify(budgets)}
        - Today's Date: ${new Date().toLocaleDateString('en-CA')}. Use this if no date is specified.

        RULES:
        1.  **Analyze & Question:** If details are missing (like category or type), ASK clarifying questions. Use the context to make smart suggestions. For example: "I see you often buy coffee. Is this another 'Personal' expense?"
        2.  **Confirm & Complete:** Once you have at least an amount, a type (income/expense), and a category, propose a confirmation. Your confirmation message should be conversational and summarize the entry clearly. Fill in any minor missing details with smart defaults (e.g., date defaults to today, medium to 'card').
        3.  **Multi-Transaction Handling:** If the user input clearly describes multiple transactions (e.g., 'sales report with cash and card totals'), create an array of transaction objects. Your confirmation message should summarize all of them.
        4.  **Budget Awareness:** When confirming an expense for a category with a budget, mention the budget status in your confirmation message. Ex: "Got it, 50 for Personal. Just so you know, you've now used 250 of your 500 budget for the month."
        5.  **Strict JSON Output:** Your *only* output must be a single, valid JSON object following the specified format. No conversational text outside the JSON structure.

        OUTPUT FORMAT:
        Your response MUST be a valid JSON object.

        - If asking a question:
          { "type": "chat", "message": "Your conversational question here.", "transactions": null }

        - For a single transaction (note 'transactions' is an array):
          { 
            "type": "confirmation", 
            "message": "Okay, I'll log an expense of 150 for Petrol. This is for your Personal category. Sound right?", 
            "transactions": [{ "amount": 150, "type": "expense", "mainCategory": "Personal", "subCategory": "Fuel", "payee": "Petrol Station", "date": "YYYY-MM-DD", "medium": "card", "notes": "From user input" }]
          }
        
        - For multiple transactions:
          {
            "type": "confirmation",
            "message": "Okay, I've got the sales report. I'll log an income of 76.75 by cash and 1,366 by card for the Gym. Does that look right?",
            "transactions": [
              { "amount": 76.75, "type": "income", "mainCategory": "Gym", "subCategory": "Daily Sales", "date": "2025-06-27", "medium": "cash", "payee": "Sales" },
              { "amount": 1366, "type": "income", "mainCategory": "Gym", "subCategory": "Daily Sales", "date": "2025-06-27", "medium": "card", "payee": "Sales" }
            ]
          }

        - For an invalid request:
           { "type": "error", "message": "Whoops, I need an amount to log a transaction. How much was it?", "transactions": null }
    `;

    const contents = [];
    if (base64Image && mimeType) {
        contents.push({
            inlineData: { data: base64Image, mimeType }
        });
    }
    contents.push({ text: userInput });

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: { parts: contents },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        const parsed = parseJsonResponse<AiChatCompletion>(response.text);
        if (!parsed) {
             return { type: 'error', message: "Sorry, I had trouble understanding that. Could you rephrase?", transactions: null };
        }
        
        // Ensure mainCategory is valid for all proposed transactions
        if (parsed.type === 'confirmation' && parsed.transactions) {
            parsed.transactions.forEach(tx => {
                if (tx.mainCategory && !MAIN_CATEGORIES.includes(tx.mainCategory)) {
                    tx.notes = (tx.notes || '') + ` | Original category suggestion: ${tx.mainCategory}. Please review.`;
                    tx.mainCategory = 'Personal'; // Default to personal if AI hallucinates a category
                }
            });
        }
        return parsed;

    } catch (error) {
        console.error("Error getting AI Chat response:", error);
        return { type: 'error', message: "I'm having trouble connecting to my brain right now. Please try again in a moment.", transactions: null };
    }
};

export const processBulkFiles = async (
    fileData: { name: string; type: 'csv' | 'image' | 'pdf'; content: string }[],
    recentTransactions: Transaction[]
): Promise<AiParsedTransaction[]> => {
    const allParsedTransactions: AiParsedTransaction[] = [];

    const imagePdfPrompt = `
        You are an expert at extracting financial data from documents. The user has uploaded an image or PDF of a receipt or statement. Extract all transaction details.

        CONTEXT:
        - User's recent transactions (for context on payees, categories): ${JSON.stringify(recentTransactions.slice(0, 20))}
        - Available Main Categories: ${MAIN_CATEGORIES.join(', ')}.

        RULES:
        1.  Scan the document for one or more transactions.
        2.  For each transaction, find the amount, date, payee/merchant, and items.
        3.  Infer mainCategory and subCategory. **Use the user's recent transactions as a guide for how they categorize things.** For example, if they often log 'Lulu Hypermarket' as 'Groceries', do the same. If unsure, default to 'Personal'.
        4.  The transaction type is almost always 'expense'. If you see words like "refund" or "credit", it could be 'income'.
        5.  Your ONLY output must be a single, valid JSON array of transaction objects, even if there's only one transaction. Return an empty array [] if no transactions are found. Do not include any text outside the JSON.
        
        OUTPUT FORMAT:
        [{ "amount": 25.50, "type": "expense", "mainCategory": "Personal", "subCategory": "Dining Out", "payee": "Starbucks", "date": "YYYY-MM-DD", "notes": "From document" }]
    `;

    const csvPrompt = `
        You are an expert at parsing financial data from CSV files. Convert each relevant row into a JSON object representing a transaction.

        CONTEXT:
        - User's recent transactions (for context on payees, categories): ${JSON.stringify(recentTransactions.slice(0, 20))}
        - Available Main Categories: ${MAIN_CATEGORIES.join(', ')}.

        CSV Content (up to 50 rows shown):
        ---
        ${"{csvText}"}
        ---
        RULES:
        1.  Analyze the headers to identify columns for: date, description/payee, and amount.
        2.  Amount might be in separate credit/debit columns. Combine them into a single 'amount' field and determine the 'type' ('income' for credit, 'expense' for debit). If amount is a single column, positive values are 'income' and negative are 'expense'.
        3.  The date format can vary. Parse it into 'YYYY-MM-DD'. If no year is present, assume the current year (${new Date().getFullYear()}).
        4.  Infer mainCategory and subCategory from the description/payee. **Crucially, use the user's recent transactions as a guide for how they categorize things.** For example, if the CSV shows a transaction for "NOON.COM" and the user has past transactions with payee "Noon" categorized under 'Personal' -> 'Shopping', you should do the same. If unsure, use 'Personal'.
        5.  Ignore summary rows, empty rows, or header rows from the output.
        6.  Your ONLY output must be a single, valid JSON array of transaction objects. Return an empty array [] if no transactions are found. Do not include any text outside the JSON.
        
        OUTPUT FORMAT:
        [{ "amount": 150, "type": "expense", "mainCategory": "Personal", "subCategory": "Groceries", "payee": "Supermarket", "date": "YYYY-MM-DD", "notes": "From CSV import" }]
    `;

    for (const file of fileData) {
        let prompt = '';
        const contents = [];

        if (file.type === 'csv') {
            prompt = csvPrompt.replace('{csvText}', file.content);
            contents.push({ text: prompt });
        } else { // image or pdf
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
                    // Basic validation and enrichment
                    if (tx.amount && tx.type && tx.date) {
                        tx.sourceFile = file.name;
                        tx.status = 'new';
                        
                        // Check for duplicates
                        const isDuplicate = recentTransactions.some(existingTx => 
                            existingTx.amount === tx.amount &&
                            new Date(existingTx.date).toDateString() === new Date(tx.date!).toDateString() &&
                            (existingTx.payee === tx.payee || existingTx.subCategory === tx.subCategory)
                        );

                        if(isDuplicate) {
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
        You are a financial analyst for a gym owner. Based on the following JSON data of recent transactions, provide 3 brief, actionable insights. Focus on spending trends, income sources, or potential savings. Frame the response as a helpful assistant.

        Transaction Data:
        ${JSON.stringify(sanitizedData, null, 2)}

        Example response: "1. Your spending on 'Gym Supplies' is higher than last month. Consider bulk buying. 2. 'Personal Training' is your top income source. Great job! 3. You have frequent expenses at 'Starbucks'. Maybe brew coffee at home to save?"
        
        Just provide the text response, no extra formatting.
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