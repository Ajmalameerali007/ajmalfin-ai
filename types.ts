export type User = 'Ajmal' | 'Irfan' | 'Shereen';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionMedium = 'cash' | 'card' | 'mamo' | 'other' | 'transfer' | 'tabby';
export type MainCategory = 'Gym' | 'Typing Services' | 'Borrowings' | 'Personal' | 'Other';

export interface EditLog {
  user: User;
  date: string; // ISO string
}

export interface Transaction {
  id: string;
  type: TransactionType;
  mainCategory: MainCategory;
  subCategory: string;
  amount: number;
  medium: TransactionMedium;
  date: string; // ISO string
  notes: string;
  payee: string;
  recordedBy: User;
  edits?: EditLog[];
}

export interface Repayment {
    amount: number;
    date: string; // ISO string
}

export interface AdditionalCost {
  description: string;
  amount: number;
}

export interface Borrowing {
  id:string;
  lenderName: string;
  principal: number;
  interest: number;
  additionalCosts: AdditionalCost[];
  loanDate: string; // ISO string
  returnDate: string; // ISO string
  repayments: Repayment[];
  status: 'active' | 'paid';
}

export type Theme = 'light' | 'dark';
export type Currency = 'AED' | 'INR';

export interface Settings {
  theme: Theme;
  currency: Currency;
  pin?: string;
  voiceEnabled?: boolean;
}

export interface Budget {
    id: string;
    category: MainCategory;
    limit: number;
}

export interface AiParsedTransaction {
  type?: TransactionType;
  mainCategory?: MainCategory;
  subCategory?: string;
  amount?: number;
  medium?: TransactionMedium;
  date?: string; // ISO string
  notes?: string;
  payee?: string;
  // Fields for bulk import review
  status?: 'new' | 'duplicate' | 'review';
  sourceFile?: string;
  originalData?: any; // To hold original CSV row or other source info
}

export interface AiChatCompletion {
  type: 'chat' | 'confirmation' | 'error';
  message: string;
  transactions: AiParsedTransaction[] | null;
}

export interface AiChatResponse {
  role: 'user' | 'assistant';
  content: string;
  imagePreview?: string;
  completion?: AiChatCompletion;
}

export interface Template {
    name: string;
    transaction: Omit<Transaction, 'id' | 'date' | 'recordedBy'>;
}