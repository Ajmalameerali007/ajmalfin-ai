
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Currency, Theme } from '../types';

const Settings: React.FC = () => {
    const { settings, updateSettings, currentUser, logout, isSaving } = useAppContext();

    const handleThemeChange = (theme: Theme) => {
        if (theme === settings.theme) return;
        updateSettings({ theme });
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    const handleCurrencyChange = (currency: Currency) => {
        if (currency === settings.currency) return;
        updateSettings({ currency });
    }
    
    return (
        <div className="space-y-8 max-w-lg mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Settings</h1>
                {currentUser && (
                    <div className="text-right">
                        <p className="text-sm text-dark-subtext">Logged in as</p>
                        <p className="font-bold">{currentUser}</p>
                    </div>
                )}
            </div>

            {/* General Settings */}
            <div className="bg-dark-card p-4 rounded-xl shadow-sm space-y-4">
                <h2 className="font-bold text-lg">General</h2>
                {/* Dark/Light Mode */}
                <div>
                    <label className="block text-sm font-medium text-dark-subtext">Theme</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <button onClick={() => handleThemeChange('light')} disabled={isSaving} className={`px-4 py-2 rounded-l-md w-full font-semibold transition-colors disabled:opacity-50 ${settings.theme === 'light' ? 'bg-light-accent text-white' : 'bg-gray-800 text-dark-text'}`}>Light</button>
                        <button onClick={() => handleThemeChange('dark')} disabled={isSaving} className={`px-4 py-2 rounded-r-md w-full font-semibold transition-colors disabled:opacity-50 ${settings.theme === 'dark' ? 'bg-accent-lemon text-black' : 'bg-gray-800 text-dark-text'}`}>Dark</button>
                    </div>
                </div>
                {/* Currency */}
                <div>
                    <label className="block text-sm font-medium text-dark-subtext">Currency</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <button onClick={() => handleCurrencyChange('AED')} disabled={isSaving} className={`px-4 py-2 rounded-l-md w-full font-semibold transition-colors disabled:opacity-50 ${settings.currency === 'AED' ? 'bg-accent-lemon text-black' : 'bg-gray-800 text-dark-text'}`}>AED</button>
                        <button onClick={() => handleCurrencyChange('INR')} disabled={isSaving} className={`px-4 py-2 rounded-r-md w-full font-semibold transition-colors disabled:opacity-50 ${settings.currency === 'INR' ? 'bg-accent-lemon text-black' : 'bg-gray-800 text-dark-text'}`}>INR</button>
                    </div>
                </div>
            </div>

            <div className="bg-dark-card p-4 rounded-xl shadow-sm space-y-4">
                <h2 className="font-bold text-lg">Account</h2>
                 <button onClick={logout} className="w-full bg-red-500 text-white font-bold py-2 rounded-lg">
                    Sign Out & Switch User
                </button>
            </div>
        </div>
    );
};

export default Settings;