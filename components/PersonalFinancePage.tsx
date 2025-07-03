
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Transaction } from '../types';
import {
    format, addMonths, isWithinInterval, isSameMonth, endOfMonth
} from 'date-fns';
import startOfMonth from 'date-fns/startOfMonth';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './common/Icons';


const TransactionRow: React.FC<{ transaction: Transaction; currency: string }> = ({ transaction, currency }) => {
    const { openAddTransactionModal } = useAppContext();
    const isIncome = transaction.type === 'income';
    return (
        <tr 
            className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors duration-150"
            onClick={() => openAddTransactionModal(transaction)}
        >
            <td className="py-2 px-3 text-sm text-dark-subtext">{format(new Date(transaction.date), 'dd MMM')}</td>
            <td className="py-2 px-3 text-dark-text">{transaction.subCategory || 'N/A'}</td>
            <td className={`py-2 px-3 text-right font-mono ${isIncome ? 'text-dark-income' : 'text-dark-expense'}`}>
                {isIncome ? '+' : '-'} {currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
            <td className="py-2 px-3 text-xs text-dark-subtext text-right">{transaction.payee}</td>
        </tr>
    );
};


const PersonalFinancePage: React.FC = () => {
    const { transactions, settings, currentUser, openAddTransactionModal } = useAppContext();
    const [displayDate, setDisplayDate] = useState(new Date());

    const { dateRangeDisplay, interval, isNextDisabled } = useMemo(() => {
        const now = new Date();
        const int = { start: startOfMonth(displayDate), end: endOfMonth(displayDate) };
        const rangeDisplay = format(displayDate, 'MMMM yyyy');
        const nextDisabled = isSameMonth(displayDate, now);
        return { dateRangeDisplay: rangeDisplay, interval: int, isNextDisabled: nextDisabled };
    }, [displayDate]);

    const { monthlyTransactions, totalIncome, totalExpenses } = useMemo(() => {
        const filtered = transactions.filter(t => {
            const txDate = new Date(t.date);
            return (
                t.mainCategory === 'Personal' &&
                t.recordedBy === currentUser &&
                isWithinInterval(txDate, interval)
            );
        });
        
        const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const sorted = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { monthlyTransactions: sorted, totalIncome: income, totalExpenses: expenses };
    }, [transactions, currentUser, interval]);

    const handlePrevious = () => setDisplayDate(d => addMonths(d, -1));
    const handleNext = () => !isNextDisabled && setDisplayDate(d => addMonths(d, 1));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">{currentUser}'s Personal Finances</h1>
                 <div className="flex gap-2">
                     <button 
                        onClick={() => openAddTransactionModal({ type: 'expense', mainCategory: 'Personal' })}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600">
                        <PlusIcon className="w-5 h-5" />
                        <span>Expense</span>
                    </button>
                    <button 
                        onClick={() => openAddTransactionModal({ type: 'income', mainCategory: 'Personal' })}
                        className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-600">
                        <PlusIcon className="w-5 h-5" />
                        <span>Income</span>
                    </button>
                </div>
            </div>
            
             <div className="bg-dark-card p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Monthly Summary</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevious} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                            <ChevronLeftIcon className="w-5 h-5"/>
                        </button>
                        <span className="font-semibold text-center w-36 text-dark-text">{dateRangeDisplay}</span>
                        <button onClick={handleNext} disabled={isNextDisabled} className="p-2 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronRightIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-green-900/50">
                        <p className="text-sm font-medium text-green-300">Income</p>
                        <p className="text-2xl font-bold text-green-200">{settings.currency} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-900/50">
                        <p className="text-sm font-medium text-red-300">Expenses</p>
                        <p className="text-2xl font-bold text-red-200">{settings.currency} {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>


            <div className="bg-dark-card rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-lg mb-2 text-dark-text">Your Personal Transactions for {dateRangeDisplay}</h3>
                <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-dark-card">
                            <tr className="border-b border-gray-700">
                                <th className="py-2 px-3 font-semibold text-sm">Date</th>
                                <th className="py-2 px-3 font-semibold text-sm">Description</th>
                                <th className="py-2 px-3 font-semibold text-sm text-right">Amount</th>
                                <th className="py-2 px-3 font-semibold text-sm text-right">Payee</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyTransactions.length > 0 ? monthlyTransactions.map(tx => <TransactionRow key={tx.id} transaction={tx} currency={settings.currency} />) : <tr><td colSpan={4} className="text-center py-8 text-dark-subtext">No personal transactions recorded this month.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PersonalFinancePage;
