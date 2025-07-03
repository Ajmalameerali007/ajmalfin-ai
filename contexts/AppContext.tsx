


import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Transaction, Borrowing, Settings, User, MainCategory, Budget, Template, EditLog, AiParsedTransaction } from '../types';
import { isFirebaseConfigured, auth } from '../firebase';
import { signOut } from 'firebase/auth'; 
import { AppData, setupAppDataListener, updateAppData as updateFirestoreData } from '../services/firestoreService';
import { FirestoreError } from 'firebase/firestore';

const defaultAppData: AppData = {
    transactions: [],
    borrowings: [],
    settings: { theme: 'dark', currency: 'AED', voiceEnabled: true },
    budgets: [],
    templates: [],
};

type ConnectionStatus = 'connecting' | 'connected' | 'offline';

interface AddTransactionModalState {
  isOpen: boolean;
  data: Transaction | AiParsedTransaction | null;
}

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isOnline: boolean;
  transactions: Transaction[];
  borrowings: Borrowing[];
  settings: Settings;
  isInitialized: boolean;
  isSaving: boolean;
  budgets: Budget[];
  templates: Template[];
  activeFilter: MainCategory | 'All';
  activityLog: { message: string, timestamp: number, type: 'success' | 'error' } | null;
  initialConnectionStatus: ConnectionStatus;
  isAiChatOpen: boolean;
  addTransactionModalState: AddTransactionModalState;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'recordedBy' | 'edits'>) => Promise<void>;
  bulkAddTransactions: (transactions: Omit<Transaction, 'id' | 'recordedBy' | 'edits'>[]) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBorrowing: (borrowing: Omit<Borrowing, 'id' | 'status' | 'repayments'>) => Promise<void>;
  updateBorrowing: (borrowing: Borrowing) => Promise<void>;
  addRepayment: (borrowingId: string, amount: number) => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  login: (user: User, pin: string) => boolean;
  logout: () => void;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addTemplate: (template: Template) => Promise<void>;
  deleteTemplate: (name: string) => Promise<void>;
  speak: (text: string) => void;
  setActiveFilter: (filter: MainCategory | 'All') => void;
  openAiChat: () => void;
  closeAiChat: () => void;
  openAddTransactionModal: (data: Transaction | AiParsedTransaction | null) => void;
  closeAddTransactionModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const UNIVERSAL_PIN = '0000';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appData, setAppData] = useState<AppData>(defaultAppData);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MainCategory | 'All'>('All');
  const [activityLog, setActivityLog] = useState<{ message: string, timestamp: number, type: 'success' | 'error' } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [initialConnectionStatus, setInitialConnectionStatus] = useState<ConnectionStatus>('connecting');
  const wasOnline = useRef(isOnline);

  // Modal States
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [addTransactionModalState, setAddTransactionModalState] = useState<AddTransactionModalState>({ isOpen: false, data: null });

  const openAiChat = useCallback(() => setIsAiChatOpen(true), []);
  const closeAiChat = useCallback(() => setIsAiChatOpen(false), []);

  const openAddTransactionModal = useCallback((data: Transaction | AiParsedTransaction | null) => {
    setAddTransactionModalState({ isOpen: true, data });
  }, []);
  const closeAddTransactionModal = useCallback(() => {
    setAddTransactionModalState({ isOpen: false, data: null });
  }, []);

  // Effect for online/offline status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Effect for handling Authentication and Initial Data Load
  useEffect(() => {
    // --- Authentication is ALWAYS local via PIN screen ---
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }

    // --- Data source depends on Firebase config ---
    if (isFirebaseConfigured) {
      // --- Firebase Data Mode ---
      const unsubscribeData = setupAppDataListener(
          (data) => {
              setAppData(data || defaultAppData);
              if (!isInitialized) {
                  setInitialConnectionStatus('connected');
                  setIsInitialized(true);
              }
          },
          (error: FirestoreError) => {
              console.error("Firestore listener failed:", error);
              if (!isInitialized) {
                   if (error.code === 'unavailable') {
                      setInitialConnectionStatus('offline');
                      console.log(
                        '%c[App Status] Connection to cloud failed. The app is now in offline mode. All data is saved locally and will sync when you reconnect.',
                        'background: #3f3f46; color: #fde047; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
                      );
                  }
                  setIsInitialized(true); 
              }
          }
      );
      return unsubscribeData; // Cleanup listener
    } else {
      // --- Local Storage Data Mode ---
      const storedData = localStorage.getItem('appData');
      if (storedData) {
        setAppData(JSON.parse(storedData));
      }
      setInitialConnectionStatus('connected'); // Local storage is always 'connected'
      setIsInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect for persisting data on changes (Local Storage Mode ONLY)
  useEffect(() => {
      if (!isFirebaseConfigured && isInitialized) {
          localStorage.setItem('appData', JSON.stringify(appData));
      }
  }, [appData, isInitialized, isFirebaseConfigured]);

  const triggerActivityLog = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setActivityLog({ message, timestamp: Date.now(), type });
  }, []);

  // Effect to notify user upon reconnection
  useEffect(() => {
    if (isOnline && !wasOnline.current) {
        // Just came back online
        triggerActivityLog('Back online! All data synced.', 'success');
    }
    wasOnline.current = isOnline;
  }, [isOnline, triggerActivityLog]);
  
  const updateGlobalData = useCallback(async (data: Partial<AppData>) => {
      if (isFirebaseConfigured) {
          return updateFirestoreData(data);
      } else {
          setAppData(prev => ({ ...prev, ...data }));
          return Promise.resolve();
      }
  }, []);

  const handleApiCall = useCallback(async (updateFunction: () => Promise<any>, successMessage: string) => {
    setIsSaving(true);
    try {
        await updateFunction();
        const finalMessage = isOnline ? successMessage : `${successMessage} (Saved offline)`;
        triggerActivityLog(finalMessage, 'success');
    } catch (e) {
        console.error("Operation failed:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        triggerActivityLog(`Error: ${errorMessage}`, 'error');
    } finally {
        setIsSaving(false);
    }
  }, [isOnline, triggerActivityLog]);
  
  // Universal PIN login for all modes
  const login = useCallback((user: User, pin: string): boolean => {
      if (pin === UNIVERSAL_PIN) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          setCurrentUser(user);
          setIsAuthenticated(true);
          return true;
      }
      return false;
  }, []);

  const logout = useCallback(() => {
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setIsAuthenticated(false);
      // Also sign out of firebase if a session exists from a previous version
      if (isFirebaseConfigured && auth && auth.currentUser) {
          signOut(auth);
      }
  }, []);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'recordedBy' | 'edits'>) => {
    if (!currentUser) return;
    const newTransaction: Transaction = { 
        ...transaction, 
        id: crypto.randomUUID(),
        recordedBy: currentUser,
    };
    const newTransactions = [newTransaction, ...appData.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await handleApiCall(() => updateGlobalData({ transactions: newTransactions }), 'Transaction Added');
  }, [currentUser, appData.transactions, updateGlobalData, handleApiCall]);
  
  const bulkAddTransactions = useCallback(async (transactions: Omit<Transaction, 'id' | 'recordedBy' | 'edits'>[]) => {
    if (!currentUser) return;
    if (transactions.length === 0) return;
    const newTransactions: Transaction[] = transactions.map((t) => ({
        ...t,
        id: crypto.randomUUID(),
        recordedBy: currentUser,
    }));
    const updatedTransactions = [...newTransactions, ...appData.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await handleApiCall(() => updateGlobalData({ transactions: updatedTransactions }), `${transactions.length} transactions added`);
  }, [currentUser, appData.transactions, updateGlobalData, handleApiCall]);

  const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
    if (!currentUser) return;
    const newEditLog: EditLog = { user: currentUser, date: new Date().toISOString() };
    const transactionWithEditLog = { ...updatedTransaction, edits: [...(updatedTransaction.edits || []), newEditLog] };
    const newTransactions = appData.transactions.map(t => t.id === transactionWithEditLog.id ? transactionWithEditLog : t);
    await handleApiCall(() => updateGlobalData({ transactions: newTransactions }), 'Transaction Updated');
  }, [currentUser, appData.transactions, updateGlobalData, handleApiCall]);

  const deleteTransaction = useCallback(async (id: string) => {
    const newTransactions = appData.transactions.filter(t => t.id !== id);
    await handleApiCall(() => updateGlobalData({ transactions: newTransactions }), 'Transaction Deleted');
  }, [appData.transactions, updateGlobalData, handleApiCall]);

  const addBorrowing = useCallback(async (borrowing: Omit<Borrowing, 'id' | 'status' | 'repayments'>) => {
    const newBorrowing: Borrowing = { ...borrowing, id: crypto.randomUUID(), status: 'active', repayments: [], additionalCosts: borrowing.additionalCosts || [], };
    const newBorrowings = [newBorrowing, ...appData.borrowings];
    await handleApiCall(() => updateGlobalData({ borrowings: newBorrowings }), 'Loan Added');
  }, [appData.borrowings, updateGlobalData, handleApiCall]);

  const updateBorrowing = useCallback(async (updatedBorrowing: Borrowing) => {
    const newBorrowings = appData.borrowings.map(b => b.id === updatedBorrowing.id ? updatedBorrowing : b);
    await handleApiCall(() => updateGlobalData({ borrowings: newBorrowings }), 'Loan Updated');
  }, [appData.borrowings, updateGlobalData, handleApiCall]);

  const addRepayment = useCallback(async (borrowingId: string, amount: number) => {
    const newBorrowings = appData.borrowings.map(b => {
        if (b.id === borrowingId) {
            const newRepayments = [...b.repayments, { amount, date: new Date().toISOString() }];
            const totalRepaid = newRepayments.reduce((sum, r) => sum + r.amount, 0);
            const totalAdditionalCosts = (b.additionalCosts || []).reduce((sum, c) => sum + c.amount, 0);
            const totalDue = b.principal * (1 + (b.interest || 0) / 100) + totalAdditionalCosts;
            const newStatus: Borrowing['status'] = totalRepaid >= totalDue ? 'paid' : 'active';
            return { ...b, repayments: newRepayments, status: newStatus };
        }
        return b;
    });
    await handleApiCall(() => updateGlobalData({ borrowings: newBorrowings }), 'Repayment Added');
  }, [appData.borrowings, updateGlobalData, handleApiCall]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...appData.settings, ...newSettings };
    await handleApiCall(() => updateGlobalData({ settings: updatedSettings }), 'Settings Updated');
  }, [appData.settings, updateGlobalData, handleApiCall]);

  const addBudget = useCallback(async (budget: Omit<Budget, 'id'>) => {
    const newBudget: Budget = { ...budget, id: crypto.randomUUID() };
    const newBudgets = [...appData.budgets, newBudget];
    await handleApiCall(() => updateGlobalData({ budgets: newBudgets }), 'Budget Added');
  }, [appData.budgets, updateGlobalData, handleApiCall]);

  const deleteBudget = useCallback(async (id: string) => {
    const newBudgets = appData.budgets.filter(b => b.id !== id);
    await handleApiCall(() => updateGlobalData({ budgets: newBudgets }), 'Budget Deleted');
  }, [appData.budgets, updateGlobalData, handleApiCall]);

  const addTemplate = useCallback(async (template: Template) => {
    if (appData.templates.some(t => t.name === template.name)) {
        triggerActivityLog('Template name already exists!', 'error');
        return;
    }
    const newTemplates = [...appData.templates, template];
    await handleApiCall(() => updateGlobalData({ templates: newTemplates }), 'Template Saved!');
  }, [appData.templates, updateGlobalData, handleApiCall, triggerActivityLog]);

  const deleteTemplate = useCallback(async (name: string) => {
    const newTemplates = appData.templates.filter(t => t.name !== name);
    await handleApiCall(() => updateGlobalData({ templates: newTemplates }), 'Template Deleted!');
  }, [appData.templates, updateGlobalData, handleApiCall]);

  const speak = useCallback((text: string) => {
      if ('speechSynthesis' in window && appData.settings.voiceEnabled) {
          try {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error("Speech synthesis failed.", e);
          }
      }
  }, [appData.settings.voiceEnabled]);

  const contextValue: AppContextType = {
      currentUser,
      isAuthenticated,
      isInitialized,
      isOnline,
      isSaving,
      transactions: appData.transactions,
      borrowings: appData.borrowings,
      settings: appData.settings,
      budgets: appData.budgets,
      templates: appData.templates,
      activeFilter,
      activityLog,
      initialConnectionStatus,
      isAiChatOpen,
      addTransactionModalState,
      addTransaction,
      bulkAddTransactions,
      updateTransaction,
      deleteTransaction,
      addBorrowing,
      updateBorrowing,
      addRepayment,
      updateSettings,
      login,
      logout,
      addBudget,
      deleteBudget,
      addTemplate,
      deleteTemplate,
      speak,
      setActiveFilter,
      openAiChat,
      closeAiChat,
      openAddTransactionModal,
      closeAddTransactionModal
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
