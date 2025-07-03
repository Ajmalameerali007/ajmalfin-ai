
import React, { useState, useRef } from 'react';
import { getAiChatResponse } from '../services/geminiService';
import { AiParsedTransaction } from '../types';
import { CameraIcon, UploadIcon } from './common/Icons';
import Spinner from './common/Spinner';
import { useAppContext } from '../contexts/AppContext';

interface OcrScannerModalProps {
  onClose: () => void;
  onConfirm: (data: AiParsedTransaction) => void;
}

type ModalState = 'idle' | 'processing' | 'confirming' | 'error';

const OcrScannerModal: React.FC<OcrScannerModalProps> = ({ onClose, onConfirm }) => {
  const { transactions, budgets } = useAppContext();
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [parsedData, setParsedData] = useState<AiParsedTransaction | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setPreviewImage(reader.result as string);
        setModalState('processing');
        processImage(base64String, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64Image: string, mimeType: string) => {
    const response = await getAiChatResponse('Extract transaction details from this receipt image.', transactions, budgets, base64Image, mimeType);
    if (response?.type === 'confirmation' && response.transactions && response.transactions.length > 0) {
      setParsedData(response.transactions[0]);
      setModalState('confirming');
    } else {
      setError(response?.message || 'Could not extract details from the image. Please try a clearer picture.');
      setModalState('error');
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
        onConfirm(parsedData);
    }
  };
  
  const handleTryAgain = () => {
      setPreviewImage(null);
      setParsedData(null);
      setError('');
      setModalState('idle');
  };

  const renderContent = () => {
    switch (modalState) {
      case 'processing':
        return (
          <>
            <Spinner />
            <h3 className="text-xl font-semibold">Analyzing Document...</h3>
            {previewImage && <img src={previewImage} alt="Preview" className="max-h-40 rounded-lg"/>}
          </>
        );
      case 'confirming':
        return (
          <>
            <h3 className="text-xl font-semibold">Create Entry from Document?</h3>
            {previewImage && <img src={previewImage} alt="Preview" className="max-h-40 rounded-lg"/>}
            <div className="text-left bg-gray-100 dark:bg-gray-700 p-4 rounded-lg w-full">
              <p><strong>Amount:</strong> {parsedData?.amount || 'N/A'}</p>
              <p><strong>Category:</strong> {parsedData?.mainCategory || 'N/A'}</p>
              <p><strong>Payee:</strong> {parsedData?.payee || 'N/A'}</p>
              <p><strong>Date:</strong> {parsedData?.date || 'N/A'}</p>
            </div>
            <div className="flex gap-4 w-full">
              <button onClick={handleTryAgain} className="w-full py-3 bg-gray-500 text-white rounded-lg">Cancel</button>
              <button onClick={handleConfirm} className="w-full py-3 bg-light-accent dark:bg-dark-accent text-white rounded-lg">Create Entry</button>
            </div>
          </>
        );
      case 'error':
        return (
          <>
            <h3 className="text-xl font-semibold text-red-500">Error</h3>
            <p>{error}</p>
            <button onClick={handleTryAgain} className="w-full py-3 bg-light-accent dark:bg-dark-accent text-white rounded-lg">Upload Another</button>
          </>
        );
      case 'idle':
      default:
        return (
          <>
            <CameraIcon className="w-16 h-16 text-light-accent dark:text-dark-accent"/>
            <h3 className="text-xl font-semibold">Scan Document</h3>
            <p className="text-light-subtext dark:text-dark-subtext">Upload a PDF or image of a receipt to automatically create an expense entry.</p>
            <input type="file" accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 bg-light-accent dark:bg-dark-accent text-white rounded-lg">
                <UploadIcon className="w-5 h-5"/>
                <span>Upload Document</span>
            </button>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="relative bg-light-card dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md p-6 text-center space-y-4 flex flex-col items-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-light-subtext dark:text-dark-subtext">&times;</button>
        {renderContent()}
      </div>
    </div>
  );
};

export default OcrScannerModal;
