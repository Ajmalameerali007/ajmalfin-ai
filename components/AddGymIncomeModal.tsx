
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TransactionMedium } from '../types';
import { XIcon, CreditCardIcon, CashIcon, PlusCircleIcon } from './common/Icons';

interface AddGymIncomeModalProps {
  onClose: () => void;
}

const AddGymIncomeModal: React.FC<AddGymIncomeModalProps> = ({ onClose }) => {
  const { bulkAddTransactions, settings, isSaving } = useAppContext();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cardAmount, setCardAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [tabbyAmount, setTabbyAmount] = useState('');

  const totalSales = useMemo(() => {
    return (parseFloat(cardAmount) || 0) + (parseFloat(cashAmount) || 0) + (parseFloat(tabbyAmount) || 0);
  }, [cardAmount, cashAmount, tabbyAmount]);
  
  const transactionsToCreate = useMemo(() => {
      const txs = [];
      const commonData = {
          type: 'income' as const,
          mainCategory: 'Gym' as const,
          subCategory: 'Daily Sales',
          date: new Date(date).toISOString(),
          notes: `Daily sales collection on ${date.split('T')[0]}`,
          payee: 'Gym Sales',
      };

      if (parseFloat(cardAmount) > 0) {
          txs.push({ ...commonData, amount: parseFloat(cardAmount), medium: 'card' as TransactionMedium });
      }
      if (parseFloat(cashAmount) > 0) {
          txs.push({ ...commonData, amount: parseFloat(cashAmount), medium: 'cash' as TransactionMedium });
      }
      if (parseFloat(tabbyAmount) > 0) {
          txs.push({ ...commonData, amount: parseFloat(tabbyAmount), medium: 'tabby' as TransactionMedium });
      }
      return txs;
  }, [date, cardAmount, cashAmount, tabbyAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (transactionsToCreate.length === 0) {
      alert('Please enter an amount for at least one medium.');
      return;
    }

    await bulkAddTransactions(transactionsToCreate);
    onClose();
  };
  
  const txCount = transactionsToCreate.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-dark-card rounded-xl shadow-2xl w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-dark-text">Log Gym Daily Sales</h2>
            <button type="button" onClick={onClose} aria-label="Close modal" className="p-1 rounded-full text-dark-subtext hover:bg-gray-700">
              <XIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-subtext">Date of Sales</label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text"
              required
              disabled={isSaving}
            />
          </div>

          <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-subtext">Sales Breakdown</label>
              <div className="flex items-center gap-3">
                  <CreditCardIcon className="w-6 h-6 text-sky-400 flex-shrink-0" />
                  <span className="w-16 text-sm">Card</span>
                  <input type="number" value={cardAmount} onChange={e => setCardAmount(e.target.value)} placeholder="0.00" className="flex-grow p-2 bg-gray-800 border border-gray-700 rounded-lg text-dark-text text-right" disabled={isSaving} step="0.01" />
              </div>
              <div className="flex items-center gap-3">
                  <CashIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <span className="w-16 text-sm">Cash</span>
                  <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="0.00" className="flex-grow p-2 bg-gray-800 border border-gray-700 rounded-lg text-dark-text text-right" disabled={isSaving} step="0.01" />
              </div>
              <div className="flex items-center gap-3">
                  <PlusCircleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                  <span className="w-16 text-sm">Tabby</span>
                  <input type="number" value={tabbyAmount} onChange={e => setTabbyAmount(e.target.value)} placeholder="0.00" className="flex-grow p-2 bg-gray-800 border border-gray-700 rounded-lg text-dark-text text-right" disabled={isSaving} step="0.01" />
              </div>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold text-dark-subtext">Total Sales</span>
                  <span className="font-bold text-dark-text">{settings.currency} {totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={isSaving || txCount === 0} className="w-full px-6 py-3 font-bold text-black bg-accent-lemon rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-wait">
              {isSaving ? 'Saving...' : (txCount > 0 ? `Save ${txCount} Transaction${txCount > 1 ? 's' : ''}` : 'Save Sales')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGymIncomeModal;
