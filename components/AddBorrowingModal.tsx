

import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { AdditionalCost } from '../types';
import { XIcon } from './common/Icons';

interface AddBorrowingModalProps {
  onClose: () => void;
}

const AddBorrowingModal: React.FC<AddBorrowingModalProps> = ({ onClose }) => {
  const { addBorrowing, settings, isSaving } = useAppContext();

  const [lenderName, setLenderName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('0');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState<{description: string; amount: string}[]>([]);

  const handleAddCost = () => {
    setAdditionalCosts([...additionalCosts, { description: '', amount: '' }]);
  };

  const handleCostChange = (index: number, field: 'description' | 'amount', value: string) => {
      const newCosts = [...additionalCosts];
      newCosts[index][field] = value;
      setAdditionalCosts(newCosts);
  };

  const handleRemoveCost = (index: number) => {
      const newCosts = additionalCosts.filter((_, i) => i !== index);
      setAdditionalCosts(newCosts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName || !principal || !returnDate) {
      alert('Please fill all required fields.');
      return;
    }
    
    const processedCosts: AdditionalCost[] = additionalCosts
        .filter(c => c.description && c.amount && parseFloat(c.amount) > 0)
        .map(c => ({ description: c.description, amount: parseFloat(c.amount) }));

    await addBorrowing({
      lenderName,
      principal: parseFloat(principal),
      interest: parseFloat(interest),
      loanDate: new Date(loanDate).toISOString(),
      returnDate: new Date(returnDate).toISOString(),
      additionalCosts: processedCosts,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-dark-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Add New Loan</h2>
            <button type="button" onClick={onClose} aria-label="Close modal" className="p-1 rounded-full text-dark-subtext hover:bg-gray-700">
                <XIcon className="w-6 h-6" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-subtext">Lender's Name</label>
            <input type="text" value={lenderName} onChange={e => setLenderName(e.target.value)} placeholder="e.g., John Smith" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" required disabled={isSaving} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-subtext">Principal ({settings.currency})</label>
              <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="1000" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" required disabled={isSaving}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-subtext">Interest (%)</label>
              <input type="number" value={interest} onChange={e => setInterest(e.target.value)} placeholder="0" className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" disabled={isSaving}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-subtext">Loan Date</label>
              <input type="date" value={loanDate} onChange={e => setLoanDate(e.target.value)} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" required disabled={isSaving}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-subtext">Agreed Return Date</label>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text" required disabled={isSaving}/>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-subtext">Additional Costs (Optional)</label>
            {additionalCosts.map((cost, index) => (
              <div key={index} className="flex gap-2 mt-2 items-center">
                <input type="text" placeholder="e.g., Fee" value={cost.description} onChange={e => handleCostChange(index, 'description', e.target.value)} className="flex-grow p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-dark-text" disabled={isSaving}/>
                <input type="number" placeholder="Amount" value={cost.amount} onChange={e => handleCostChange(index, 'amount', e.target.value)} className="w-28 p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-dark-text" disabled={isSaving}/>
                <button type="button" onClick={() => handleRemoveCost(index)} className="text-red-500 font-bold text-lg p-1" disabled={isSaving}>&times;</button>
              </div>
            ))}
            <button type="button" onClick={handleAddCost} className="mt-2 text-sm text-accent-lemon font-semibold" disabled={isSaving}>+ Add Cost</button>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={isSaving} className="w-full px-6 py-3 font-bold text-black bg-accent-lemon rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-wait">
              {isSaving ? 'Saving...' : 'Add Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBorrowingModal;