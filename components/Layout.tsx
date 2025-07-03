
import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { CogIcon, ChevronLeftIcon, ExclamationIcon, SparklesIcon } from './common/Icons';
import ActivityToast from './common/ActivityToast';
import AiChatModal from './AiChatModal';
import AddTransactionModal from './AddTransactionModal';

const Layout: React.FC = () => {
    const { 
        currentUser, 
        logout, 
        isOnline, 
        isAiChatOpen, 
        openAiChat, 
        closeAiChat,
        addTransactionModalState,
        closeAddTransactionModal,
    } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        if(window.confirm('Are you sure you want to logout?')) {
            logout();
        }
    };
    
    const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

    return (
        <div className="flex flex-col h-screen w-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text overflow-hidden">
            <header className="flex-shrink-0 bg-light-card dark:bg-dark-card shadow-md z-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                           {!isDashboard && (
                                <button onClick={() => navigate('/dashboard')} aria-label="Back to Dashboard" className="p-1 rounded-full text-dark-subtext hover:text-accent-lemon transition-colors">
                                    <ChevronLeftIcon className="w-6 h-6"/>
                                </button>
                            )}
                            <h1 className="text-xl font-bold text-light-text dark:text-dark-text">
                               Welcome, {currentUser}
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/settings')} aria-label="Settings" className="text-dark-subtext hover:text-accent-lemon">
                                <CogIcon className="w-6 h-6"/>
                            </button>
                            <button onClick={handleLogout} className="text-sm font-semibold bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 transition-colors">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {!isOnline && (
                <div className="bg-yellow-600 text-white text-center p-2 text-sm font-semibold flex items-center justify-center gap-2 z-10">
                    <ExclamationIcon className="w-5 h-5" />
                    You are currently offline. Changes will sync when you reconnect.
                </div>
            )}

            <main className="flex-1 overflow-y-auto pb-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Outlet />
                </div>
            </main>

            {/* Floating Action Button */}
            <button 
              onClick={openAiChat}
              className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-accent-lemon to-lime-500 text-black rounded-full shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform z-40"
              aria-label="Open AI Assistant"
            >
                <SparklesIcon className="w-8 h-8"/>
            </button>
            
            <ActivityToast />
            
            {/* Gloablly managed modals */}
            {isAiChatOpen && <AiChatModal onClose={closeAiChat} />}
            {addTransactionModalState.isOpen && 
                <AddTransactionModal 
                    isOpen={true} 
                    onClose={closeAddTransactionModal} 
                    transactionToEdit={addTransactionModalState.data && 'id' in addTransactionModalState.data ? addTransactionModalState.data : null} 
                    aiData={addTransactionModalState.data && !('id' in addTransactionModalState.data) ? addTransactionModalState.data : null} 
                />
            }
        </div>
    );
};

export default Layout;
