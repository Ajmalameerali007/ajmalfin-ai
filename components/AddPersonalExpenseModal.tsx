
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TransactionMedium } from '../types';
import { PERSONAL_EXPENSE_SUGGESTIONS } from '../constants';
import { XIcon } from './common/Icons';

interface AddPersonalExpenseModalProps {
  onClose: () => void;
}

const AddPersonalExpenseModal: React.FC<AddPersonalExpenseModalProps> = ({ onClose }) => {
  const { addTransaction, settings, isSaving } = useAppContext();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [medium, setMedium] = useState<TransactionMedium>('card');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!description) {
      alert('Please provide a description or select one.');
      return;
    }

    await addTransaction({
      type: 'expense',
      mainCategory: 'Personal',
      subCategory: description,
      amount: numericAmount,
      medium: medium,
      date: new Date().toISOString(),
      notes: '',
      payee: 'Personal Expense',
    });

    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-dark-card rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-dark-text">Add Personal Expense</h2>
            <button type="button" onClick={onClose} aria-label="Close modal" className="p-1 rounded-full text-dark-subtext hover:bg-gray-700">
              <XIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-subtext">Amount ({settings.currency})</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-2xl font-bold text-dark-text" required autoFocus disabled={isSaving}/>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-subtext">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Type or select a category below" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" required disabled={isSaving}/>
          </div>

          <div>
             <label className="block text-sm font-medium text-dark-subtext mb-2">Quick Select</label>
             <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {PERSONAL_EXPENSE_SUGGESTIONS.map(tag => (
                    <button 
                        type="button" 
                        key={tag} 
                        onClick={() => setDescription(tag)} 
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${description === tag ? 'bg-accent-lemon text-black' : 'bg-gray-700 text-dark-text hover:bg-gray-600'}`}
                        disabled={isSaving}
                    >
                        {tag}
                    </button>
                ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-subtext">Payment Medium</label>
            <select value={medium} onChange={e => setMedium(e.target.value as TransactionMedium)} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" disabled={isSaving}>
                <option value="card">Bank/Card</option>
                <option value="cash">Cash</option>
                <option value="mamo">Mamo</option>
                <option value="other">Other</option>
            </select>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={isSaving} className="w-full px-6 py-3 font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait">
              {isSaving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonalExpenseModal;