
import React, { useState, useEffect } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { getAiChatResponse } from '../services/geminiService';
import { AiParsedTransaction } from '../types';
import { MicrophoneIcon } from './common/Icons';
import Spinner from './common/Spinner';
import { useAppContext } from '../contexts/AppContext';

interface VoiceCommandModalProps {
  onClose: () => void;
  onConfirm: (data: AiParsedTransaction) => void;
}

type ModalState = 'idle' | 'listening' | 'processing' | 'confirming' | 'error';

const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({ onClose, onConfirm }) => {
  const { settings, transactions, budgets } = useAppContext();
  const { isListening, transcript, startListening, stopListening, setTranscript, error: speechError } = useSpeech();
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [parsedData, setParsedData] = useState<AiParsedTransaction | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (speechError) {
        setError(speechError);
        setModalState('error');
    }
  }, [speechError]);

  useEffect(() => {
    if (isListening) {
      setModalState('listening');
    } else if (transcript && modalState === 'listening') {
      setModalState('processing');
      handleParseTranscript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, transcript]);

  const handleListenClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setError('');
      setParsedData(null);
      startListening();
    }
  };

  const handleParseTranscript = async () => {
    const response = await getAiChatResponse(transcript, transactions, budgets);
    if (response?.type === 'confirmation' && response.transactions && response.transactions.length > 0) {
      setParsedData(response.transactions[0]);
      setModalState('confirming');
    } else {
      setError(response?.message || 'Sorry, I could not understand that. Please try again.');
      setModalState('error');
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
        onConfirm(parsedData);
    }
  };
  
  const handleTryAgain = () => {
      setTranscript('');
      setParsedData(null);
      setError('');
      setModalState('idle');
  }

  const renderContent = () => {
    switch (modalState) {
      case 'listening':
        return (
          <>
            <h3 className="text-xl font-semibold">Listening...</h3>
            <p className="text-light-subtext dark:text-dark-subtext">Speak your transaction, e.g., "Paid 50 AED for gym supplies"</p>
          </>
        );
      case 'processing':
        return (
          <>
            <Spinner />
            <h3 className="text-xl font-semibold">Processing...</h3>
            <p className="text-light-subtext dark:text-dark-subtext">"{transcript}"</p>
          </>
        );
      case 'confirming':
        const confirmationText = `I've got a new ${parsedData?.type || 'entry'} of ${parsedData?.amount || '?'} ${settings.currency} for "${parsedData?.mainCategory || 'Uncategorized'}". Sound right?`;
        return (
          <>
            <h3 className="text-xl font-semibold">Confirm Entry</h3>
            <p className="text-center text-light-subtext dark:text-dark-subtext px-4">{confirmationText}</p>
            <div className="text-left bg-gray-100 dark:bg-gray-700 p-4 rounded-lg w-full text-sm">
              <p><strong>Type:</strong> <span className="capitalize">{parsedData?.type}</span></p>
              <p><strong>Amount:</strong> {parsedData?.amount} {settings.currency}</p>
              <p><strong>Category:</strong> {parsedData?.mainCategory}</p>
              <p><strong>Payee:</strong> {parsedData?.payee || 'N/A'}</p>
              <p><strong>Date:</strong> {parsedData?.date}</p>
              {parsedData?.notes && <p><strong>Notes:</strong> {parsedData.notes}</p>}
            </div>
            <div className="flex gap-4 w-full">
              <button onClick={handleTryAgain} className="w-full py-3 bg-gray-500 text-white rounded-lg">No, Try Again</button>
              <button onClick={handleConfirm} className="w-full py-3 bg-light-accent dark:bg-dark-accent text-white rounded-lg">Yes, Confirm</button>
            </div>
          </>
        );
       case 'error':
        return (
            <>
                <h3 className="text-xl font-semibold text-red-500">Error</h3>
                <p className="text-light-subtext dark:text-dark-subtext">{error}</p>
                <button onClick={handleTryAgain} className="w-full py-3 bg-light-accent dark:bg-dark-accent text-white rounded-lg">Try Again</button>
            </>
        )
      case 'idle':
      default:
        return (
          <>
            <h3 className="text-xl font-semibold">Tap to Speak</h3>
            <p className="text-light-subtext dark:text-dark-subtext">Say something like "Income of 2000 from gym membership"</p>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="relative bg-light-card dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md p-6 text-center space-y-4 flex flex-col items-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-light-subtext dark:text-dark-subtext">&times;</button>
        
        {renderContent()}

        <button onClick={handleListenClick} className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-red-500' : 'bg-light-accent dark:bg-dark-accent'}`}>
          <MicrophoneIcon className="w-10 h-10 text-white" />
        </button>
      </div>
    </div>
  );
};

export default VoiceCommandModal;
