
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

interface PinScreenProps {
  onAuthSuccess: () => void;
}

const PinScreen: React.FC<PinScreenProps> = ({ onAuthSuccess }) => {
  const { settings } = useAppContext();
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (enteredPin.length === 4) {
      if (enteredPin === settings.pin) {
        onAuthSuccess();
      } else {
        setError('Incorrect PIN. Please try again.');
        setEnteredPin('');
      }
    } else {
        setError('');
    }
  }, [enteredPin, settings.pin, onAuthSuccess]);

  const handleNumberClick = (num: string) => {
    if (enteredPin.length < 4) {
      setEnteredPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const PinDots = () => (
    <div className="flex justify-center space-x-4 my-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < enteredPin.length ? 'bg-light-accent dark:bg-dark-accent' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
      ))}
    </div>
  );

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text p-4">
      <div className="text-center max-w-xs w-full">
        <h1 className="text-2xl font-bold">Enter PIN</h1>
        <p className="text-light-subtext dark:text-dark-subtext">Enter your 4-digit PIN to unlock.</p>
        
        <PinDots />
        
        {error && <p className="text-red-500 text-sm h-5">{error}</p>}
        {!error && <div className="h-5"></div>}
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[...Array(9)].map((_, i) => {
            const num = (i + 1).toString();
            return <button key={num} onClick={() => handleNumberClick(num)} className="p-4 text-2xl font-bold bg-light-card dark:bg-dark-card rounded-full shadow-sm">{num}</button>
          })}
          <div />
          <button onClick={() => handleNumberClick('0')} className="p-4 text-2xl font-bold bg-light-card dark:bg-dark-card rounded-full shadow-sm">0</button>
          <button onClick={handleDelete} className="p-4 text-2xl font-bold bg-light-card dark:bg-dark-card rounded-full shadow-sm">⌫</button>
        </div>
      </div>
    </div>
  );
};

export default PinScreen;
