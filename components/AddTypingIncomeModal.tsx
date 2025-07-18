
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TransactionMedium } from '../types';
import { XIcon } from './common/Icons';

interface AddTypingIncomeModalProps {
  onClose: () => void;
}

const AddTypingIncomeModal: React.FC<AddTypingIncomeModalProps> = ({ onClose }) => {
  const { addTransaction, settings, isSaving } = useAppContext();
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [medium, setMedium] = useState<TransactionMedium>('card');
  const [notes, setNotes] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!payee) {
        alert('Please enter a customer name (payee).');
        return;
    }

    await addTransaction({
      type: 'income',
      mainCategory: 'Typing Services',
      subCategory: 'Project Payment',
      amount: numericAmount,
      medium: medium,
      date: new Date().toISOString(),
      notes,
      payee,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-dark-card rounded-xl shadow-2xl w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-dark-text">Add Typing Income</h2>
            <button type="button" onClick={onClose} aria-label="Close modal" className="p-1 rounded-full text-dark-subtext hover:bg-gray-700">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-subtext">Amount ({settings.currency})</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-2xl font-bold text-dark-text" required autoFocus disabled={isSaving}/>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-subtext">Customer / Payee</label>
            <input type="text" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="e.g., Client Name" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" required disabled={isSaving}/>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-subtext">Payment Medium</label>
            <select value={medium} onChange={e => setMedium(e.target.value as TransactionMedium)} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" disabled={isSaving}>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="mamo">Mamo</option>
                <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-subtext">Notes (Optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Advance for website project" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" disabled={isSaving}/>
          </div>


          <div className="pt-2">
            <button type="submit" disabled={isSaving} className="w-full px-6 py-3 font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-wait">
              {isSaving ? 'Saving...' : 'Save Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTypingIncomeModal;