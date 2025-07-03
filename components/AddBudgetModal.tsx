
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { MainCategory } from '../types';
import { MAIN_CATEGORIES } from '../constants';
import { XIcon } from './common/Icons';

interface AddBudgetModalProps {
  onClose: () => void;
}

const AddBudgetModal: React.FC<AddBudgetModalProps> = ({ onClose }) => {
  const { addBudget, settings, budgets, isSaving } = useAppContext();

  const availableCategories = MAIN_CATEGORIES.filter(c => !budgets.some(b => b.category === c));

  const [category, setCategory] = useState<MainCategory>(() => availableCategories.length > 0 ? availableCategories[0] : 'Personal');
  const [limit, setLimit] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !limit || parseFloat(limit) <= 0) {
      alert('Please select a category and enter a valid limit.');
      return;
    }
    await addBudget({ category, limit: parseFloat(limit) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-dark-card rounded-xl shadow-2xl w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-dark-text">Set New Budget</h2>
            <button type="button" onClick={onClose} aria-label="Close modal" className="p-1 rounded-full text-dark-subtext hover:bg-gray-700">
                <XIcon className="w-6 h-6" />
            </button>
          </div>
          
          {availableCategories.length > 0 ? (
            <>
                <div>
                    <label className="block text-sm font-medium text-dark-subtext">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value as MainCategory)} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" disabled={isSaving}>
                        {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-dark-subtext">Monthly Limit ({settings.currency})</label>
                    <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="500" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" required disabled={isSaving}/>
                </div>
                
                <div className="pt-2">
                    <button type="submit" disabled={isSaving} className="w-full px-6 py-3 font-bold text-black bg-accent-lemon rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-wait">
                      {isSaving ? 'Saving...' : 'Set Budget'}
                    </button>
                </div>
            </>
          ) : (
             <p className="text-dark-subtext text-center py-4">All categories already have a budget.</p>
          )}

        </form>
      </div>
    </div>
  );
};

export default AddBudgetModal;