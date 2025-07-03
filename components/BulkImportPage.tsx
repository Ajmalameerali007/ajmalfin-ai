import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { processBulkFiles } from '../services/geminiService';
import { addTransactionToCloud } from '../services/addTransactionToCloud';

const BulkImportPage: React.FC = () => {
  const { transactions, setTransactions } = useAppContext();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setStatus('Reading files...');

    const fileData: { name: string; type: 'pdf' | 'image'; content: string }[] = [];

    for (const file of Array.from(files)) {
      const base64 = await toBase64(file);
      const type = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
      fileData.push({ name: file.name, type, content: base64 });
    }

    setStatus('Processing with AI...');
    const aiResults = await processBulkFiles(fileData, transactions);

    if (aiResults.length === 0) {
      setStatus('No transactions found in the uploaded files.');
    } else {
      setStatus(`Saving ${aiResults.length} to Firebase...`);

      for (const tx of aiResults) {
        if (tx.status !== 'duplicate') {
          await addTransactionToCloud({
            amount: tx.amount,
            type: tx.type,
            mainCategory: tx.mainCategory,
            subCategory: tx.subCategory,
            payee: tx.payee,
            date: tx.date,
            medium: tx.medium || 'cash',
            notes: tx.notes || '',
            addedBy: tx.addedBy || 'Ajmal'
          });
        }
      }

      setStatus('Done! Saved to cloud.');
    }

    setUploading(false);
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result?.toString().split(',')[1];
        if (result) resolve(result);
        else reject('Failed to convert file');
      };
      reader.onerror = error => reject(error);
    });

  return (
    <div className="max-w-2xl mx-auto bg-dark-card p-6 rounded-xl shadow-lg space-y-6">
      <h1 className="text-2xl font-bold text-dark-text">Import from File</h1>
      <p className="text-dark-subtext">Upload scanned receipts, PDFs, or screenshots. AI will try to extract all financial data.</p>

      <input
        type="file"
        accept=".pdf,image/*"
        multiple
        disabled={uploading}
        onChange={handleFileUpload}
        className="block w-full border border-gray-600 p-2 rounded bg-gray-800 text-white"
      />

      {status && <p className="text-sm text-dark-subtext">{status}</p>}
    </div>
  );
};

export default BulkImportPage;
