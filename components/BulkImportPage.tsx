

import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { useAppContext } from '../contexts/AppContext';
import { processBulkFiles } from '../services/geminiService';
import { AiParsedTransaction, MainCategory, TransactionType } from '../types';
import Spinner from './common/Spinner';
import { UploadIcon, TrashIcon, CheckCircleIcon, ExclamationIcon, RefreshIcon } from './common/Icons';

type FileStatus = 'pending' | 'reading' | 'processing' | 'success' | 'error';

interface FileWithStatus {
    file: File;
    status: FileStatus;
    message?: string;
}

interface SuggestedTransaction extends AiParsedTransaction {
    id: string;
    isChecked: boolean;
}

const readFileContent = (file: File): Promise<{ name: string; type: 'csv' | 'image' | 'pdf'; content: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));

        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            reader.onload = () => {
                const base64Content = (reader.result as string).split(',')[1];
                resolve({ 
                    name: file.name, 
                    type: file.type === 'application/pdf' ? 'pdf' : 'image',
                    content: base64Content 
                });
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
             reader.onload = () => {
                 resolve({ name: file.name, type: 'csv', content: reader.result as string });
             };
             reader.readAsText(file);
        } else {
            reject(new Error('Unsupported file type'));
        }
    });
};


const BulkImportPage: React.FC = () => {
    const { bulkAddTransactions, isSaving, transactions } = useAppContext();
    const [files, setFiles] = useState<FileWithStatus[]>([]);
    const [suggestedTxs, setSuggestedTxs] = useState<SuggestedTransaction[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map(file => ({ file, status: 'pending' as FileStatus }));
        setFiles(prev => [...prev, ...newFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpeg', '.jpg'],
            'application/pdf': ['.pdf'],
            'text/csv': ['.csv'],
        },
    });

    const handleProcessFiles = async () => {
        setIsProcessing(true);
        setSuggestedTxs([]);
        
        const fileDataToProcess: { name: string; type: 'csv' | 'image' | 'pdf'; content: string }[] = [];

        await Promise.all(files.map(async (f) => {
            try {
                const content = await readFileContent(f.file);
                fileDataToProcess.push(content);
            } catch (error) {
                console.error(`Error reading ${f.file.name}:`, error);
            }
        }));

        if (fileDataToProcess.length > 0) {
            const results = await processBulkFiles(fileDataToProcess, transactions);
            const enrichedResults = results.map((tx, index) => ({
                ...tx,
                id: `${Date.now()}-${index}`,
                isChecked: tx.status !== 'duplicate',
            }));
            setSuggestedTxs(enrichedResults);
        }

        setIsProcessing(false);
    };

    const handleTxChange = (id: string, field: keyof SuggestedTransaction, value: any) => {
        setSuggestedTxs(prev => prev.map(tx => tx.id === id ? { ...tx, [field]: value } : tx));
    };
    
    const handleToggleAll = (check: boolean) => {
        setSuggestedTxs(prev => prev.map(tx => ({...tx, isChecked: check})));
    }

    const handleImport = async () => {
        const txsToImport = suggestedTxs
            .filter(tx => tx.isChecked)
            .map(({ id, isChecked, status, sourceFile, originalData, ...rest }) => ({
                ...rest,
                type: rest.type || 'expense',
                mainCategory: rest.mainCategory || 'Personal',
                subCategory: rest.subCategory || 'Misc',
                amount: rest.amount || 0,
                medium: rest.medium || 'card',
                date: rest.date ? new Date(rest.date).toISOString() : new Date().toISOString(),
                notes: rest.notes || `Imported from ${sourceFile}`,
                payee: rest.payee || 'Unknown',
            }));

        if (txsToImport.length > 0) {
            await bulkAddTransactions(txsToImport);
            setSuggestedTxs([]);
            setFiles([]);
        }
    };
    
    const selectedCount = useMemo(() => suggestedTxs.filter(tx => tx.isChecked).length, [suggestedTxs]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">AI File Import</h1>

            <div className="bg-blue-900/50 p-4 rounded-lg border border-blue-700 text-sm text-blue-200 space-y-2">
                <h2 className="font-bold text-base">How it works:</h2>
                <p><strong>1. Upload:</strong> Add your bank statements, receipts, or CSV files.</p>
                <p><strong>2. AI Suggests:</strong> Our AI will read the files and suggest transactions for you to review.</p>
                <p><strong>3. Review & Import:</strong> Check the suggestions, make any edits, and import them with one click.</p>
            </div>

            <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${isDragActive ? 'border-accent-lemon bg-gray-800/50' : 'border-gray-700 hover:border-gray-500'}`}>
                <input {...getInputProps()} />
                <UploadIcon className="w-12 h-12 mx-auto text-dark-subtext" />
                <p className="mt-2 font-semibold">Drag & drop files here, or click to select</p>
                <p className="text-sm text-dark-subtext">Supports: CSV, PDF, JPG, PNG</p>
            </div>
            
            {files.length > 0 && (
                 <div className="bg-dark-card p-4 rounded-xl space-y-3">
                    <h3 className="font-bold">Uploaded Files</h3>
                    {files.map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                            <span>{f.file.name}</span>
                            <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    ))}
                    <button onClick={handleProcessFiles} disabled={isProcessing} className="w-full bg-accent-lemon text-black font-bold py-2 rounded-lg mt-2 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isProcessing ? <><Spinner /> Processing...</> : 'Suggest Transactions with AI'}
                    </button>
                 </div>
            )}
            
            {isProcessing && <div className="text-center p-8"><Spinner /> <p className="mt-2">AI is analyzing your files... this may take a moment.</p></div>}

            {suggestedTxs.length > 0 && !isProcessing && (
                <div className="bg-dark-card p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Review Suggested Transactions ({suggestedTxs.length})</h3>
                        <button onClick={() => { setSuggestedTxs([]); setFiles([])}} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300">
                           <RefreshIcon className="w-4 h-4" /> Start Over
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-700">
                                <tr>
                                    <th className="p-2"><input type="checkbox" checked={selectedCount === suggestedTxs.length} onChange={(e) => handleToggleAll(e.target.checked)}/></th>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Payee</th>
                                    <th className="p-2">Category</th>
                                    <th className="p-2">Amount</th>
                                    <th className="p-2">Type</th>
                                    <th className="p-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suggestedTxs.map(tx => (
                                    <tr key={tx.id} className={`${!tx.isChecked ? 'opacity-50' : ''} border-b border-gray-800 hover:bg-gray-800/50`}>
                                        <td className="p-2"><input type="checkbox" checked={tx.isChecked} onChange={(e) => handleTxChange(tx.id, 'isChecked', e.target.checked)} /></td>
                                        <td className="p-2"><input type="date" value={tx.date?.split('T')[0] || ''} onChange={(e) => handleTxChange(tx.id, 'date', e.target.value)} className="bg-transparent w-32 focus:bg-gray-700 rounded p-1"/></td>
                                        <td className="p-2"><input type="text" value={tx.payee || ''} onChange={(e) => handleTxChange(tx.id, 'payee', e.target.value)} className="bg-transparent w-32 focus:bg-gray-700 rounded p-1"/></td>
                                        <td className="p-2"><input type="text" value={tx.subCategory || ''} onChange={(e) => handleTxChange(tx.id, 'subCategory', e.target.value)} className="bg-transparent w-32 focus:bg-gray-700 rounded p-1"/></td>
                                        <td className="p-2"><input type="number" value={tx.amount || ''} onChange={(e) => handleTxChange(tx.id, 'amount', parseFloat(e.target.value))} className="bg-transparent w-24 focus:bg-gray-700 rounded p-1"/></td>
                                        <td className="p-2">
                                            <select value={tx.type || ''} onChange={(e) => handleTxChange(tx.id, 'type', e.target.value)} className="bg-transparent focus:bg-gray-700 rounded p-1">
                                                <option value="expense">Expense</option>
                                                <option value="income">Income</option>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            {tx.status === 'duplicate' && <span title={`Possible duplicate from ${tx.sourceFile}`} className="flex items-center gap-1 text-yellow-400"><ExclamationIcon className="w-4 h-4"/> Dup</span>}
                                            {tx.status === 'new' && <span title={`From ${tx.sourceFile}`} className="flex items-center gap-1 text-green-400"><CheckCircleIcon className="w-4 h-4"/> New</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <button onClick={handleImport} disabled={isSaving || selectedCount === 0} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg mt-2 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isSaving ? <><Spinner /> Importing...</> : `Import ${selectedCount} Selected Transactions`}
                    </button>
                </div>
            )}

        </div>
    );
};

export default BulkImportPage;