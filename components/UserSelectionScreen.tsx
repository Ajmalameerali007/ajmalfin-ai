import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { User } from '../types';

const users: User[] = ['Ajmal', 'Irfan', 'Shereen'];

const UserProfile: React.FC<{ user: User, onSelect: (user: User) => void }> = ({ user, onSelect }) => (
    <div onClick={() => onSelect(user)} className="flex flex-col items-center gap-2 cursor-pointer group">
        <div className="w-24 h-24 bg-dark-card rounded-full flex items-center justify-center text-4xl font-bold text-accent-lemon group-hover:bg-accent-lemon group-hover:text-black transition-colors">
            {user.charAt(0)}
        </div>
        <span className="font-semibold text-lg">{user}</span>
    </div>
);

const PinScreen: React.FC<{ user: User, onBack: () => void }> = ({ user, onBack }) => {
    const { login } = useAppContext();
    const [enteredPin, setEnteredPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (enteredPin.length === 4) {
            const success = login(user, enteredPin);
            if (!success) {
                setError('Incorrect PIN.');
                setTimeout(() => {
                    setEnteredPin('');
                    setError('');
                }, 1000);
            }
        } else {
            setError('');
        }
    }, [enteredPin, login, user]);

    const handleNumberClick = (num: string) => {
        if (enteredPin.length < 4) {
          setEnteredPin(prev => prev + num);
        }
    };
    
    const handleDelete = () => setEnteredPin(prev => prev.slice(0, -1));

    const PinDots = () => (
        <div className="flex justify-center space-x-4 my-4">
        {[...Array(4)].map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < enteredPin.length ? 'bg-accent-lemon' : 'bg-gray-600'} ${error ? 'animate-shake bg-red-500' : ''}`}></div>
        ))}
        </div>
    );

    return (
        <div className="w-full max-w-xs mx-auto flex flex-col items-center">
            <button onClick={onBack} className="self-start text-dark-subtext mb-4 hover:text-dark-text">&larr; Back to users</button>
            <h1 className="text-2xl font-bold">Enter PIN for {user}</h1>
            <PinDots />
            <div className="text-red-500 text-sm h-5 mb-2">{error}</div>
            <div className="grid grid-cols-3 gap-4 mt-2 w-full">
                {[...Array(9)].map((_, i) => {
                    const num = (i + 1).toString();
                    return <button key={num} onClick={() => handleNumberClick(num)} className="p-4 text-2xl font-bold bg-dark-card rounded-full shadow-sm aspect-square">{num}</button>
                })}
                <div />
                <button onClick={() => handleNumberClick('0')} className="p-4 text-2xl font-bold bg-dark-card rounded-full shadow-sm aspect-square">0</button>
                <button onClick={handleDelete} className="p-4 text-2xl font-bold bg-dark-card rounded-full shadow-sm aspect-square">⌫</button>
            </div>
        </div>
    );
};


const UserSelectionScreen: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-dark-bg text-dark-text p-4">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-dark-text">
                Ajmal<span className="text-accent-lemon">Fin</span>
            </h1>
            <p className="text-dark-subtext">Who's using the app?</p>
        </div>
      
      {selectedUser ? (
          <PinScreen user={selectedUser} onBack={() => setSelectedUser(null)} />
      ) : (
          <div className="flex flex-wrap justify-center gap-8">
            {users.map(user => <UserProfile key={user} user={user} onSelect={setSelectedUser} />)}
          </div>
      )}
    </div>
  );
};

export default UserSelectionScreen;