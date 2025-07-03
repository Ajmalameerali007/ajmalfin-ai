
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useCategoryFinance } from '../hooks/useCategoryFinance';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { PlusIcon } from './common/Icons';
import AddGymIncomeModal from './AddGymIncomeModal';

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
            <td className="py-2 px-3 text-xs text-dark-subtext text-right">{transaction.recordedBy}</td>
        </tr>
    );
};

const GymPage: React.FC = () => {
    const { settings, openAddTransactionModal } = useAppContext();
    const { allSortedTransactions, totalIncome, totalExpenses, profit } = useCategoryFinance('Gym');
    const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Gym Finances</h1>
                <div className="flex gap-2">
                     <button 
                        onClick={() => openAddTransactionModal({ type: 'expense', mainCategory: 'Gym' })}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600">
                        <PlusIcon className="w-5 h-5" />
                        <span>Expense</span>
                    </button>
                    <button 
                        onClick={() => setIsAddIncomeModalOpen(true)}
                        className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-600">
                        <PlusIcon className="w-5 h-5" />
                        <span>Income</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="p-4 rounded-xl bg-green-900/50">
                     <p className="text-sm font-medium text-green-300">Total Income</p>
                     <p className="text-2xl font-bold text-green-200">{settings.currency} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div className="p-4 rounded-xl bg-red-900/50">
                     <p className="text-sm font-medium text-red-300">Total Expenses</p>
                     <p className="text-2xl font-bold text-red-200">{settings.currency} {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div className="p-4 rounded-xl bg-blue-900/50">
                     <p className="text-sm font-medium text-blue-300">Net Profit</p>
                     <p className="text-2xl font-bold text-blue-200">{settings.currency} {profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                 </div>
            </div>

            <div className="bg-dark-card rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-lg mb-2 text-dark-text">Recent Gym Transactions</h3>
                <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-dark-card">
                            <tr className="border-b border-gray-700">
                                <th className="py-2 px-3 font-semibold text-sm">Date</th>
                                <th className="py-2 px-3 font-semibold text-sm">Description</th>
                                <th className="py-2 px-3 font-semibold text-sm text-right">Amount</th>
                                <th className="py-2 px-3 font-semibold text-sm text-right">By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allSortedTransactions.length > 0 ? allSortedTransactions.map(tx => <TransactionRow key={tx.id} transaction={tx} currency={settings.currency} />) : <tr><td colSpan={4} className="text-center py-8 text-dark-subtext">No gym transactions recorded.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            {isAddIncomeModalOpen && <AddGymIncomeModal onClose={() => setIsAddIncomeModalOpen(false)} />}
        </div>
    );
};

export default GymPage;
