
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Borrowing } from '../types';
import { format } from 'date-fns';
import { PlusIcon } from './common/Icons';
import AddBorrowingModal from './AddBorrowingModal';

const BorrowingItem: React.FC<{ borrowing: Borrowing }> = ({ borrowing }) => {
    const { settings, addRepayment, isSaving } = useAppContext();
    const [repaymentAmount, setRepaymentAmount] = useState('');

    const totalAdditionalCosts = (borrowing.additionalCosts || []).reduce((sum, c) => sum + c.amount, 0);
    const principalWithInterestAndCosts = borrowing.principal * (1 + (borrowing.interest || 0) / 100) + totalAdditionalCosts;
    const totalRepaid = borrowing.repayments.reduce((sum, r) => sum + r.amount, 0);
    const balance = principalWithInterestAndCosts - totalRepaid;
    const progress = principalWithInterestAndCosts > 0 ? (totalRepaid / principalWithInterestAndCosts) * 100 : 100;

    const parsedRepaymentAmount = parseFloat(repaymentAmount) || 0;

    const handleAddRepayment = async () => {
        if (parsedRepaymentAmount > 0 && parsedRepaymentAmount <= balance) {
            await addRepayment(borrowing.id, parsedRepaymentAmount);
            setRepaymentAmount('');
        } else {
            alert('Please enter a valid repayment amount that is not more than the balance.');
        }
    };

    return (
        <div className="bg-dark-card p-4 rounded-lg shadow-sm space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-lg text-dark-text">{borrowing.lenderName} <span className="text-sm font-normal text-dark-subtext">({borrowing.interest || 0}% interest)</span></p>
                    <p className="text-sm text-dark-subtext">
                        Due by {format(new Date(borrowing.returnDate), 'MMM d, yyyy')}
                    </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${borrowing.status === 'active' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>
                    {borrowing.status}
                </span>
            </div>
            
            {borrowing.additionalCosts && borrowing.additionalCosts.length > 0 && (
                <div className="text-xs text-dark-subtext border-t border-gray-700 mt-2 pt-2">
                    <p className="font-semibold">Additional Costs:</p>
                    <ul className="list-disc pl-5">
                        {borrowing.additionalCosts.map((cost, i) => (
                            <li key={i} className="flex justify-between">
                                <span>{cost.description}</span>
                                <span>{settings.currency} {cost.amount.toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                <div className="flex justify-between text-sm font-medium mb-1 text-dark-text">
                    <span>Repaid: {settings.currency} {totalRepaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span>Total Due: {settings.currency} {principalWithInterestAndCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div className="bg-accent-lemon h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-right text-sm font-bold mt-1 text-dark-text">Balance: {settings.currency} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            {borrowing.status === 'active' && (
                <div className="flex gap-2">
                    <input 
                        type="number"
                        value={repaymentAmount}
                        onChange={(e) => setRepaymentAmount(e.target.value)}
                        placeholder={`Amount to repay (${settings.currency})`}
                        className="flex-grow p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-dark-text"
                        disabled={isSaving}
                    />
                    <button onClick={handleAddRepayment} disabled={isSaving || parsedRepaymentAmount <= 0 || parsedRepaymentAmount > balance} className="bg-accent-lemon text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-wait">
                        {isSaving ? 'Saving...' : 'Repay'}
                    </button>
                </div>
            )}
        </div>
    );
};


const Borrowings: React.FC = () => {
    const { borrowings } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const activeBorrowings = borrowings.filter(b => b.status === 'active');
    const paidBorrowings = borrowings.filter(b => b.status === 'paid');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Borrowings</h1>
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-accent-lemon text-black px-4 py-2 rounded-lg shadow-md hover:opacity-90">
                    <PlusIcon className="w-5 h-5" />
                    <span>New Loan</span>
                </button>
            </div>
            
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Active Loans</h2>
                {activeBorrowings.length > 0 ? (
                    activeBorrowings.map(b => <BorrowingItem key={b.id} borrowing={b} />)
                ) : (
                    <p className="text-dark-subtext text-center py-4">No active loans.</p>
                )}
            </div>

             <div className="space-y-4">
                <h2 className="text-xl font-semibold">Paid Off</h2>
                {paidBorrowings.length > 0 ? (
                    paidBorrowings.map(b => <BorrowingItem key={b.id} borrowing={b} />)
                ) : (
                    <p className="text-dark-subtext text-center py-4">No paid loans yet.</p>
                )}
            </div>
            
            {isAddModalOpen && <AddBorrowingModal onClose={() => setIsAddModalOpen(false)} />}
        </div>
    );
};

export default Borrowings;