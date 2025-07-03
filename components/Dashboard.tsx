import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { loadAllTransactions } from '../services/loadAllTransactions';
import { ChartPieIcon, DocumentTextIcon, HomeIcon, SparklesIcon, UploadIcon, PlusIcon, UserCircleIcon } from './common/Icons';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { transactions, setTransactions } = useAppContext();

  useEffect(() => {
    const fetch = async () => {
      const cloudTx = await loadAllTransactions();
      setTransactions(cloudTx); // 👈 update app-wide state
    };
    fetch();
  }, []);

  const summary = useMemo(() => {
    const cashInHand = transactions.filter(t => t.medium === 'cash').reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    const bankTotal = transactions.filter(t => ['card', 'mamo', 'tabby', 'other'].includes(t.medium)).reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { cashInHand, bankTotal, totalBalance: totalIncome - totalExpenses };
  }, [transactions]);

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Total Balance" amount={summary.totalBalance} bgColor="bg-gradient-to-br from-lime-300 to-green-400" />
        <SummaryCard title="Bank/Card" amount={summary.bankTotal} bgColor="bg-gradient-to-br from-sky-300 to-blue-400" />
        <SummaryCard title="Cash in Hand" amount={summary.cashInHand} bgColor="bg-gradient-to-br from-red-300 to-pink-400" />
      </div>

      <div className="bg-dark-card p-4 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-dark-text px-3 pb-2">Recent Activity</h2>
        {recentTransactions.length > 0 ? (
          <ul className="space-y-1">
            {recentTransactions.map(tx => (
              <li key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                    <PlusIcon className={`w-6 h-6 ${tx.type === 'income' ? 'text-green-300' : 'text-red-300 -rotate-45'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-dark-text">{tx.subCategory || tx.payee || 'Transaction'}</p>
                    <p className="text-xs text-dark-subtext">{format(new Date(tx.date), 'dd MMM yyyy')} • {tx.mainCategory}</p>
                  </div>
                </div>
                <p className={`font-mono font-semibold ${tx.type === 'income' ? 'text-dark-income' : 'text-dark-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'} AED {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-dark-subtext">
            <p>No transactions yet.</p>
            <p className="text-sm">Click the ✨ button to add your first one!</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NavButton to="/gym" title="Gym" icon={HomeIcon} description="Manage gym finances." />
        <NavButton to="/typing-services" title="Typing Services" icon={SparklesIcon} description="Manage project finances." />
        <NavButton to="/personal" title="Personal Finances" icon={UserCircleIcon} description="Track personal spending." />
        <NavButton to="/borrowings" title="Borrowings" icon={DocumentTextIcon} description="Track loans & repayments." />
        <NavButton to="/reports" title="All Reports" icon={ChartPieIcon} description="View financial reports." />
        <NavButton to="/bulk-import" title="AI File Import" icon={UploadIcon} description="Import transactions from files." />
      </div>
    </div>
  );
};

export default Dashboard;

const SummaryCard = ({ title, amount, bgColor }: { title: string; amount: number; bgColor: string }) => {
  const { settings } = useAppContext();
  return (
    <div className={`p-4 rounded-xl shadow-lg ${bgColor} text-black`}>
      <p className="text-sm font-semibold opacity-80">{title}</p>
      <p className="text-3xl font-bold tracking-tight">
        {settings.currency} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
};

const NavButton = ({ to, title, icon: Icon, description, className = '' }: any) => (
  <Link to={to} className={`bg-dark-card p-6 rounded-2xl shadow-lg hover:bg-gray-800 hover:shadow-accent-lemon/10 transition-all transform hover:-translate-y-1 group ${className}`}>
    <Icon className="w-10 h-10 text-accent-lemon mb-3"/>
    <h2 className="text-xl font-bold text-dark-text">{title}</h2>
    <p className="text-sm text-dark-subtext mt-1">{description}</p>
  </Link>
);