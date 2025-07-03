import { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { MainCategory } from '../types';

export const useCategoryFinance = (category: MainCategory) => {
    const { transactions } = useAppContext();

    const categoryData = useMemo(() => {
        const categoryTransactions = transactions.filter(t => t.mainCategory === category);
        const incomeTransactions = categoryTransactions.filter(t => t.type === 'income');
        const expenseTransactions = categoryTransactions.filter(t => t.type === 'expense');

        const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
        const profit = totalIncome - totalExpenses;
        
        const allSortedTransactions = [...incomeTransactions, ...expenseTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            allSortedTransactions,
            totalIncome,
            totalExpenses,
            profit,
        };
    }, [transactions, category]);

    return categoryData;
};
