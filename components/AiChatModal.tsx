
import React, { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { getAiChatResponse } from '../services/geminiService';
import { AiParsedTransaction, AiChatResponse, AiChatCompletion, Transaction } from '../types';
import { MicrophoneIcon, PaperclipIcon, SparklesIcon, XIcon } from './common/Icons';
import Spinner from './common/Spinner';
import { useAppContext } from '../contexts/AppContext';

interface AiChatModalProps {
  onClose: () => void;
}

const SmartPromptButton: React.FC<{ text: string, onClick: () => void }> = ({ text, onClick }) => (
    <button
        onClick={onClick}
        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-dark-subtext hover:bg-gray-700 hover:border-accent-lemon/50 transition-colors"
    >
        💡 {text}
    </button>
);

const AiChatModal: React.FC<AiChatModalProps> = ({ onClose }) => {
  const { settings, addTransaction, speak, transactions, budgets, openAddTransactionModal, closeAiChat } = useAppContext();
  const { isListening, transcript, startListening, stopListening, setTranscript, error: speechError } = useSpeech();
  const [messages, setMessages] = useState<AiChatResponse[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const smartPrompts = [
    "Groceries for 120 AED",
    "Gym membership income 2000",
    "Paid rent 3000 from card yesterday"
  ];

  useEffect(() => {
    setMessages([{ role: 'assistant', content: "Hi there! Ready to log today's transactions? You can speak, type, or snap a receipt 📸" }]);
  }, []);
  
  useEffect(() => {
    if (transcript) {
        setInputValue(transcript);
        setTranscript('');
    }
  }, [transcript, setTranscript]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSendMessage = async (text: string, image?: { base64: string; mime: string, preview: string }) => {
    if (!text && !image) return;
    
    const userMessage: AiChatResponse = {
        role: 'user',
        content: text,
        ...(image && { imagePreview: image.preview })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setInputValue('');

    const response = await getAiChatResponse(text, transactions, budgets, image?.base64, image?.mime);
    
    if (response) {
      const assistantMessage: AiChatResponse = {
        role: 'assistant',
        content: response.message,
        completion: response,
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (settings.voiceEnabled && response.type !== 'confirmation') {
        speak(response.message);
      }
    }
    
    setIsProcessing(false);
  };
  
  const handleConfirmTransactions = (parsedTransactions: AiParsedTransaction[]) => {
    parsedTransactions.forEach(parsedData => {
        const finalData = {
            type: parsedData.type || 'expense',
            mainCategory: parsedData.mainCategory || 'Personal',
            subCategory: parsedData.subCategory || 'Uncategorized',
            amount: parsedData.amount || 0,
            medium: parsedData.medium || 'card',
            date: parsedData.date ? new Date(parsedData.date).toISOString() : new Date().toISOString(),
            notes: parsedData.notes || '',
            payee: parsedData.payee || '',
        };
        addTransaction(finalData);
    });

    if (parsedTransactions.length > 1) {
        speak(`Got it! I've added ${parsedTransactions.length} new transactions.`);
    } else if (parsedTransactions.length === 1) {
        speak(`Got it! I've added the ${parsedTransactions[0].type || 'entry'}.`);
    }

    onClose();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        handleSendMessage('Analyze this receipt.', { base64: base64String, mime: file.type, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
      event.target.value = ''; // Reset file input
    }
  };

  const ConfirmationCard: React.FC<{ completion: AiChatCompletion }> = ({ completion }) => {
    if (completion.type !== 'confirmation' || !completion.transactions || completion.transactions.length === 0) return null;
    
    const { transactions: txs } = completion;

    const handleEditClick = () => {
        openAddTransactionModal(txs[0]);
        closeAiChat();
    };

    return (
        <div className="bg-blue-900/50 p-4 rounded-lg mt-2 border border-blue-700">
            <h4 className="font-bold text-blue-200">Confirm Transaction{txs.length > 1 ? 's' : ''}</h4>
            <div className="text-sm space-y-1 mt-2 text-blue-300 divide-y divide-blue-800">
                {txs.map((tx, index) => (
                    <div key={index} className="pt-2 first:pt-0">
                        <p><strong>{tx.type?.toUpperCase() || 'ENTRY'}</strong>: <span className="font-semibold">{tx.amount ? `${settings.currency} ${tx.amount}` : 'N/A'}</span> via {tx.medium || 'N/A'}</p>
                        <p><strong>For:</strong> {tx.mainCategory || 'N/A'} ({tx.subCategory || 'N/A'})</p>
                        {tx.payee && <p><strong>Payee:</strong> {tx.payee}</p>}
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-4">
                <button onClick={() => handleConfirmTransactions(txs)} className="flex-1 bg-accent-lemon text-black text-sm font-bold py-2 px-3 rounded-md hover:opacity-90">Add Transaction{txs.length > 1 ? 's' : ''}</button>
                <button 
                    onClick={handleEditClick} 
                    className="flex-1 bg-gray-600 text-sm font-semibold py-2 px-3 rounded-md hover:bg-gray-500 disabled:opacity-50"
                    disabled={txs.length > 1}
                    title={txs.length > 1 ? 'Editing is available for single transactions only.' : ''}
                >
                    Edit Details
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-end z-50">
      <div className="bg-dark-card rounded-t-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col">
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-accent-lemon" />
                <h2 className="text-xl font-bold">AI Assistant</h2>
             </div>
             <button onClick={onClose} aria-label="Close modal" className="p-1 rounded-full text-dark-subtext hover:bg-gray-700">
                <XIcon className="w-6 h-6" />
             </button>
        </header>
        
        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`w-fit max-w-xs md:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-accent-lemon text-black font-medium rounded-br-lg' : 'bg-gray-800 text-dark-text rounded-bl-lg'}`}>
                {msg.imagePreview && <img src={msg.imagePreview} alt="upload preview" className="rounded-lg mb-2 max-h-40" />}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.completion && <ConfirmationCard completion={msg.completion} />}
              </div>
            </div>
          ))}
          {isProcessing && (
             <div className="flex gap-3 justify-start">
                <div className="w-fit max-w-xs md:max-w-md p-3 rounded-2xl bg-gray-800 rounded-bl-lg flex items-center gap-2">
                    <Spinner/>
                    <span className="text-sm text-dark-subtext">Thinking...</span>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>
        
        {!isProcessing && messages.length < 3 && (
             <div className="px-4 pb-2 flex flex-wrap gap-2 justify-center">
                {smartPrompts.map(prompt => (
                    <SmartPromptButton key={prompt} text={prompt} onClick={() => handleSendMessage(prompt)} />
                ))}
            </div>
        )}

        <footer className="p-3 border-t border-gray-700">
            {speechError && <p className="text-center text-xs text-red-500 mb-2 px-2">{speechError}</p>}
            <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-1 shadow-sm transition-all duration-300 focus-within:ring-2 focus-within:ring-accent-lemon/50">
                <input type="file" accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} aria-label="Attach file" title="Upload a receipt (PDF or image)" className="p-2 text-dark-subtext hover:text-accent-lemon">
                    <PaperclipIcon className="w-6 h-6"/>
                </button>
                <input 
                    type="text" 
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputValue)}
                    placeholder="Type a transaction, or use 🎤 / 📎"
                    className="flex-1 bg-transparent focus:outline-none px-2 text-dark-text"
                    disabled={isProcessing}
                />
                <button onClick={isListening ? stopListening : startListening} aria-label={isListening ? 'Stop listening' : 'Start listening'} title="Record a voice transaction" className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-dark-subtext hover:text-accent-lemon'}`}>
                    <MicrophoneIcon className="w-6 h-6" />
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default AiChatModal;
