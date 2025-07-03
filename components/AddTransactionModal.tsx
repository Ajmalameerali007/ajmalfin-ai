

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Transaction, AiParsedTransaction, TransactionType, TransactionMedium, MainCategory } from '../types';
import { MAIN_CATEGORIES, SUGGESTED_EXPENSE_TAGS, SUGGESTED_INCOME_TAGS } from '../constants';
import { XIcon } from './common/Icons';
import { format } from 'date-fns';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
  aiData?: AiParsedTransaction | null;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, transactionToEdit, aiData }) => {
    const { addTransaction, updateTransaction, deleteTransaction, bulkAddTransactions, settings, activeFilter, addTemplate, budgets, transactions, templates, isSaving } = useAppContext();

    const getInitialState = () => {
        const initialState = {
            type: 'expense' as TransactionType,
            mainCategory: (activeFilter !== 'All' ? activeFilter : 'Personal') as MainCategory,
            subCategory: '',
            amount: '',
            medium: 'card' as TransactionMedium,
            date: new Date().toISOString().split('T')[0],
            notes: '',
            payee: '',
            fromMedium: 'card' as TransactionMedium,
            toMedium: 'cash' as TransactionMedium,
            saveAsTemplate: false,
            templateName: '',
        };

        if (transactionToEdit) {
            return {
                ...initialState,
                ...transactionToEdit,
                amount: transactionToEdit.amount.toString(),
                date: new Date(transactionToEdit.date).toISOString().split('T')[0],
            };
        }
        if (aiData) {
            return {
                ...initialState,
                type: aiData.type || initialState.type,
                mainCategory: aiData.mainCategory || initialState.mainCategory,
                subCategory: aiData.subCategory || initialState.subCategory,
                amount: aiData.amount?.toString() || initialState.amount,
                medium: aiData.medium || initialState.medium,
                date: aiData.date || initialState.date,
                notes: aiData.notes || initialState.notes,
                payee: aiData.payee || initialState.payee,
            };
        }
        return initialState;
    }

    const [formData, setFormData] = useState(getInitialState);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialState());
            setSelectedTemplate('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionToEdit, aiData, isOpen, activeFilter]);

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateName = e.target.value;
        setSelectedTemplate(templateName);
        if (templateName) {
            const template = templates.find(t => t.name === templateName);
            if (template) {
                // When a template is loaded, apply its data but keep certain fields like the date as default.
                setFormData(prev => ({
                    ...getInitialState(), // Start fresh to clear any previous state
                    ...template.transaction,
                    amount: template.transaction.amount.toString(),
                    date: prev.date, // Keep the current date from the form
                }));
            }
        } else {
            // Reset to initial if "-- Select Template --" is chosen
            setFormData(getInitialState());
        }
    }


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
        // If user starts typing, de-select the template
        if (selectedTemplate) {
            setSelectedTemplate('');
        }
    };

    const budgetInfo = useMemo(() => {
        if (formData.type !== 'expense' || !formData.mainCategory) return null;
        
        const budget = budgets.find(b => b.category === formData.mainCategory);
        if (!budget) return null;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        let currentExpenses = transactions
            .filter(t => 
                t.type === 'expense' &&
                t.mainCategory === formData.mainCategory &&
                new Date(t.date) >= startOfMonth &&
                new Date(t.date) <= endOfMonth
            )
            .reduce((sum, t) => sum + t.amount, 0);
        
        if (transactionToEdit && transactionToEdit.id && transactionToEdit.mainCategory === formData.mainCategory && transactionToEdit.type === 'expense') {
             const txDate = new Date(transactionToEdit.date);
             if (txDate >= startOfMonth && txDate <= endOfMonth) {
                currentExpenses -= transactionToEdit.amount;
             }
        }

        const newAmount = parseFloat(formData.amount) || 0;
        const projectedExpenses = currentExpenses + newAmount;
        const remaining = budget.limit - projectedExpenses;

        return {
            limit: budget.limit,
            projectedExpenses,
            remaining,
        };

    }, [formData.type, formData.mainCategory, formData.amount, budgets, transactions, transactionToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { type, mainCategory, subCategory, amount, medium, date, notes, payee, fromMedium, toMedium, saveAsTemplate, templateName } = formData;
        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        if (type === 'transfer') {
            if (fromMedium === toMedium) {
                alert('Cannot transfer to the same medium.');
                return;
            }
             const commonData = {
                mainCategory: 'Personal' as MainCategory,
                amount: parseFloat(amount),
                date: new Date(date).toISOString(),
                notes,
                payee,
            };
            
            const expenseTx = { ...commonData, type: 'expense' as TransactionType, medium: fromMedium, subCategory: `Transfer to ${toMedium}` };
            const incomeTx = { ...commonData, type: 'income' as TransactionType, medium: toMedium, subCategory: `Transfer from ${fromMedium}` };
            
            await bulkAddTransactions([expenseTx, incomeTx]);

        } else {
             const transactionData = {
                type,
                mainCategory,
                subCategory,
                amount: parseFloat(amount),
                medium,
                date: new Date(date).toISOString(),
                notes,
                payee,
            };
            
            if (saveAsTemplate && templateName) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { date, ...templateData } = transactionData;
                await addTemplate({ name: templateName, transaction: templateData as any });
            }

            if (transactionToEdit) {
                 const updatedTx: Transaction = {
                    ...transactionData,
                    id: transactionToEdit.id,
                    recordedBy: transactionToEdit.recordedBy,
                    edits: transactionToEdit.edits,
                };
                await updateTransaction(updatedTx);
            } else {
                await addTransaction(transactionData);
            }
        }

        onClose();
    };
    
    const handleDelete = async () => {
        if(transactionToEdit && window.confirm('Are you sure you want to delete this transaction?')) {
            await deleteTransaction(transactionToEdit.id);
            onClose();
        }
    }
    
    const suggestedTags = formData.type === 'income' ? SUGGESTED_INCOME_TAGS[formData.mainCategory] : SUGGESTED_EXPENSE_TAGS[formData.mainCategory];
    const isTransfer = formData.type === 'transfer';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-dark-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-dark-text">{transactionToEdit ? 'Edit' : 'Add'} Transaction</h2>
                        <button type="button" onClick={onClose} aria-label="Close modal" className="p-1 rounded-full text-dark-subtext hover:bg-gray-700">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {transactionToEdit && transactionToEdit.subCategory.includes('Transfer') && (
                        <div className="p-3 bg-yellow-900/50 rounded-lg border border-yellow-700 text-yellow-300 text-sm">
                            <strong>Warning:</strong> You are editing one side of a transfer. Changes here will not affect the other side. To reverse a transfer, it's best to delete both entries and create a new one.
                        </div>
                    )}
                    
                    {!transactionToEdit && templates.length > 0 && (
                         <div>
                            <label className="block text-sm font-medium text-dark-subtext">Load from Template</label>
                            <select value={selectedTemplate} onChange={handleTemplateChange} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text">
                                <option value="">-- Select a Template --</option>
                                {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="flex rounded-md shadow-sm">
                        <button type="button" onClick={() => setFormData(f => ({ ...f, type: 'income' }))} className={`px-4 py-2 rounded-l-md w-full font-semibold transition-colors ${formData.type === 'income' ? 'bg-dark-income text-black' : 'bg-gray-800 text-dark-text'}`}>Income</button>
                        <button type="button" onClick={() => setFormData(f => ({ ...f, type: 'expense' }))} className={`px-4 py-2 w-full font-semibold transition-colors ${formData.type === 'expense' ? 'bg-dark-expense text-white' : 'bg-gray-800 text-dark-text'}`}>Expense</button>
                        <button type="button" onClick={() => setFormData(f => ({ ...f, type: 'transfer' }))} className={`px-4 py-2 rounded-r-md w-full font-semibold transition-colors ${formData.type === 'transfer' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-dark-text'}`}>Transfer</button>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-dark-subtext">Amount ({settings.currency})</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-2xl font-bold text-dark-text" required step="0.01" />
                        {budgetInfo && formData.amount && (
                            <div className="mt-2 text-xs p-2 bg-gray-800/70 rounded-md">
                                {budgetInfo.remaining >= 0 ? (
                                    <p className="text-green-400">
                                        This will leave you with <span className="font-bold">{settings.currency} {budgetInfo.remaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span> in your {formData.mainCategory} budget.
                                    </p>
                                ) : (
                                    <p className="text-red-400">
                                        This will put you <span className="font-bold">{settings.currency} {Math.abs(budgetInfo.remaining).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span> over your {formData.mainCategory} budget.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-subtext">Main Category</label>
                            <select name="mainCategory" value={formData.mainCategory} onChange={handleChange} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text">
                                {MAIN_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-dark-subtext">Date</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" required />
                        </div>
                    </div>
                    
                    {!isTransfer && (
                        <>
                             <div>
                                <label className="block text-sm font-medium text-dark-subtext">Sub Category / Tag</label>
                                <input type="text" name="subCategory" value={formData.subCategory} onChange={handleChange} placeholder="e.g., Groceries, Rent" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" />
                            </div>
                            {suggestedTags && suggestedTags.length > 0 && (
                                <div>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {suggestedTags.map(tag => <button type="button" key={tag} onClick={() => setFormData(f => ({ ...f, subCategory: tag }))} className="px-3 py-1 bg-gray-700 rounded-full text-xs text-dark-subtext">{tag}</button>)}
                                    </div>
                                </div>
                            )}
                             <div>
                                <label className="block text-sm font-medium text-dark-subtext">Medium</label>
                                <select name="medium" value={formData.medium} onChange={handleChange} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text">
                                    <option value="card">Card</option>
                                    <option value="cash">Cash</option>
                                    <option value="mamo">Mamo</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </>
                    )}
                    
                    {isTransfer && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-subtext">From</label>
                                <select name="fromMedium" value={formData.fromMedium} onChange={handleChange} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text">
                                    <option value="card">Card</option>
                                    <option value="cash">Cash</option>
                                    <option value="mamo">Mamo</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-subtext">To</label>
                                <select name="toMedium" value={formData.toMedium} onChange={handleChange} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text">
                                    <option value="card">Card</option>
                                    <option value="cash">Cash</option>
                                    <option value="mamo">Mamo</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-dark-subtext">Payee / Notes</label>
                        <input type="text" name="payee" value={formData.payee} onChange={handleChange} placeholder="e.g., Starbucks, Client Name" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" />
                    </div>
                    
                    {!transactionToEdit && !isTransfer && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center">
                                <input id="saveAsTemplate" type="checkbox" name="saveAsTemplate" checked={formData.saveAsTemplate} onChange={handleChange} className="h-4 w-4 rounded border-gray-600 text-accent-lemon focus:ring-accent-lemon"/>
                                <label htmlFor="saveAsTemplate" className="ml-2 block text-sm text-dark-subtext">Save as Template</label>
                            </div>
                            {formData.saveAsTemplate && (
                                <input type="text" name="templateName" value={formData.templateName} onChange={handleChange} placeholder="e.g., Rent" className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-dark-text text-sm" required={formData.saveAsTemplate} />
                            )}
                        </div>
                    )}

                    {transactionToEdit && transactionToEdit.edits && transactionToEdit.edits.length > 0 && (
                        <div className="text-xs text-dark-subtext p-3 bg-gray-800/50 rounded-lg space-y-1">
                            <h4 className="font-semibold">Edit History:</h4>
                            <ul className="list-disc list-inside">
                                {transactionToEdit.edits.slice().reverse().map((edit, index) => (
                                    <li key={index}>
                                        Edited by <strong>{edit.user}</strong> on {format(new Date(edit.date), 'dd MMM yyyy, h:mm a')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {transactionToEdit && (
                         <div className="text-xs text-dark-subtext">Originally recorded by <strong>{transactionToEdit.recordedBy}</strong>.</div>
                     )}


                    <div className="pt-2 flex gap-4">
                        {transactionToEdit && (
                             <button type="button" onClick={handleDelete} disabled={isSaving} className="w-full px-6 py-3 font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait">
                                {isSaving ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                        <button type="submit" disabled={isSaving} className="w-full px-6 py-3 font-bold text-black bg-accent-lemon rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-wait">
                            {isSaving ? 'Saving...' : (transactionToEdit ? 'Update' : 'Save') + ' Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTransactionModal;