
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getAIInsights } from '../services/geminiService';
import { MAIN_CATEGORIES } from '../constants';
import { MainCategory } from '../types';
import { LightBulbIcon, PlusIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from './common/Icons';
import AddBudgetModal from './AddBudgetModal';
import Papa from 'papaparse';
import {
    format,
    addMonths,
    addWeeks,
    addDays,
    isWithinInterval,
    isSameDay, isSameWeek, isSameMonth,
    endOfMonth,
    endOfWeek,
    endOfDay
} from 'date-fns';
import startOfMonth from 'date-fns/startOfMonth';
import startOfWeek from 'date-fns/startOfWeek';
import startOfDay from 'date-fns/startOfDay';


type Period = 'Daily' | 'Weekly' | 'Monthly';

// A new, self-contained component for the P&L chart
const PnlChart: React.FC<{ pnlData: { [key in MainCategory]?: { income: number, expense: number } }, currency: string }> = ({ pnlData, currency }) => {
    const allValues = useMemo(() => Object.values(pnlData).flatMap(d => d ? [d.income, d.expense] : [0, 0]), [pnlData]);
    const maxValue = useMemo(() => Math.max(...allValues, 1), [allValues]); // Use 1 as a minimum to avoid division by zero

    if (allValues.every(v => v === 0)) {
        return (
            <div className="text-center py-10 text-dark-subtext">
                <p>No transaction data to display for this period.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-5">
            {MAIN_CATEGORIES.map(cat => {
                const data = pnlData[cat];
                if (!data || (data.income === 0 && data.expense === 0)) return null;
                
                const { income, expense } = data;
                const incomeWidth = (income / maxValue) * 100;
                const expenseWidth = (expense / maxValue) * 100;

                return (
                    <div key={cat}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-dark-text">{cat}</h3>
                            <p className="text-xs font-mono text-dark-subtext">
                                Net: <span className={`font-bold ${(income - expense) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {currency} {(income - expense).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </p>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                                    <div 
                                        className="bg-dark-income h-5 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${incomeWidth}%` }}
                                    />
                                </div>
                                <span className="w-24 text-left font-mono text-green-300">{currency} {income.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                                    <div 
                                        className="bg-dark-expense h-5 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${expenseWidth}%` }}
                                    />
                                </div>
                                <span className="w-24 text-left font-mono text-red-300">{currency} {expense.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const Reports: React.FC = () => {
    const { transactions, settings, speak, budgets, deleteBudget, isSaving } = useAppContext();
    const [period, setPeriod] = useState<Period>('Monthly');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [aiInsights, setAiInsights] = useState<string | null>(null);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false);

    const { dateRangeDisplay, interval, isNextDisabled } = useMemo(() => {
        const now = new Date();
        let rangeDisplay = '';
        let int: { start: Date, end: Date };
        let nextDisabled = false;

        if (period === 'Monthly') {
            int = { start: startOfMonth(displayDate), end: endOfMonth(displayDate) };
            rangeDisplay = format(displayDate, 'MMMM yyyy');
            nextDisabled = isSameMonth(displayDate, now);
        } else if (period === 'Weekly') {
            const start = startOfWeek(displayDate);
            const end = endOfWeek(displayDate);
            int = { start, end };
            rangeDisplay = `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
            nextDisabled = isSameWeek(displayDate, now);
        } else { // Daily
            int = { start: startOfDay(displayDate), end: endOfDay(displayDate) };
            rangeDisplay = format(displayDate, 'MMMM d, yyyy');
            nextDisabled = isSameDay(displayDate, now);
        }
        return { dateRangeDisplay: rangeDisplay, interval: int, isNextDisabled: nextDisabled };
    }, [displayDate, period]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const txDate = new Date(t.date);
            return isWithinInterval(txDate, interval);
        });
    }, [transactions, interval]);


    const pnlData = useMemo(() => {
        const data = MAIN_CATEGORIES.reduce((acc, category) => {
            acc[category] = { income: 0, expense: 0 };
            return acc;
        }, {} as { [key in MainCategory]: { income: number, expense: number } });


        filteredTransactions.forEach(t => {
            if (data[t.mainCategory]) {
                if (t.type === 'income') {
                    data[t.mainCategory].income += t.amount;
                } else if (t.type === 'expense') {
                    data[t.mainCategory].expense += t.amount;
                }
            }
        });

        return data;
    }, [filteredTransactions]);

    const handlePrevious = () => {
        if (period === 'Monthly') setDisplayDate(d => addMonths(d, -1));
        else if (period === 'Weekly') setDisplayDate(d => addWeeks(d, -1));
        else setDisplayDate(d => addDays(d, -1));
    };

    const handleNext = () => {
        if (isNextDisabled) return;
        if (period === 'Monthly') setDisplayDate(d => addMonths(d, 1));
        else if (period === 'Weekly') setDisplayDate(d => addWeeks(d, 1));
        else setDisplayDate(d => addDays(d, 1));
    };
    
    const handleGenerateInsights = async () => {
        setIsLoadingInsights(true);
        setAiInsights(null);
        const insights = await getAIInsights(transactions);
        setAiInsights(insights);
        setIsLoadingInsights(false);
        if (insights) {
            speak(insights);
        }
    };
    
    const handleExportCSV = () => {
        const dataToExport = transactions.map(tx => ({
            'ID': tx.id,
            'Type': tx.type,
            'Main Category': tx.mainCategory,
            'Sub Category': tx.subCategory,
            'Amount': tx.amount,
            'Currency': settings.currency,
            'Medium': tx.medium,
            'Date': tx.date,
            'Payee': tx.payee,
            'Notes': tx.notes,
            'Recorded By': tx.recordedBy
        }));

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `ajmalfin_export_${new Date().toISOString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Reports</h1>
                 <button onClick={handleExportCSV} className="text-sm font-medium text-accent-lemon p-2 rounded-lg hover:bg-dark-card">
                    Export CSV
                </button>
            </div>
            
            <div className="bg-dark-card p-4 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold mb-3">AI-Generated Insights</h2>
                <div className="p-4 bg-blue-900/50 rounded-lg text-blue-200 min-h-[6rem] flex items-center justify-center">
                    {isLoadingInsights ? <p>Generating insights...</p> : aiInsights ? <p className="whitespace-pre-wrap">{aiInsights}</p> : <p className="text-center">Click the button to get AI-powered insights on your financial habits.</p>}
                </div>
                <button onClick={handleGenerateInsights} disabled={isLoadingInsights} className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 disabled:opacity-50 transition-colors">
                   <LightBulbIcon className="w-5 h-5"/>
                   <span>{isLoadingInsights ? "Thinking..." : "Generate Trend Insights"}</span>
                </button>
            </div>

            <div className="bg-dark-card p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Budget Management</h2>
                     <button onClick={() => setIsAddBudgetModalOpen(true)} className="flex items-center gap-2 bg-accent-lemon text-black px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                        <PlusIcon className="w-4 h-4" />
                        Add Budget
                    </button>
                </div>
                <div className="space-y-2">
                    {budgets.length > 0 ? budgets.map(b => (
                        <div key={b.id} className="flex justify-between items-center p-2 bg-gray-800/50 rounded-md">
                            <span className="font-semibold">{b.category}: {settings.currency} {b.limit.toLocaleString()} / month</span>
                            <button onClick={() => deleteBudget(b.id)} disabled={isSaving} className="p-1 text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    )) : <p className="text-dark-subtext text-center py-3">No budgets set. Add one to start tracking!</p>}
                </div>
            </div>

            <div className="bg-dark-card p-4 rounded-xl shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-lg font-bold shrink-0">P&L by Category</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevious} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                            <ChevronLeftIcon className="w-5 h-5"/>
                        </button>
                        <span className="font-semibold text-center w-36 md:w-48 text-dark-text">{dateRangeDisplay}</span>
                        <button onClick={handleNext} disabled={isNextDisabled} className="p-2 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronRightIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="flex items-center rounded-full bg-gray-800 p-1 text-sm shrink-0">
                        {(['Daily', 'Weekly', 'Monthly'] as Period[]).map(p => (
                            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-full font-semibold transition-colors whitespace-nowrap ${period === p ? 'bg-accent-lemon text-black shadow' : 'text-dark-text hover:bg-gray-700'}`}>{p}</button>
                        ))}
                    </div>
                </div>
                
                <PnlChart pnlData={pnlData} currency={settings.currency} />
            </div>
            {isAddBudgetModalOpen && <AddBudgetModal onClose={() => setIsAddBudgetModalOpen(false)} />}
        </div>
    );
};

export default Reports;