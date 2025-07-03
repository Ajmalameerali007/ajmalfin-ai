

import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './contexts/AppContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Borrowings from './components/Borrowings';
import Reports from './components/Reports';
import Settings from './components/Settings';
import UserSelectionScreen from './components/UserSelectionScreen';
import GymPage from './components/GymPage';
import TypingServicesPage from './components/TypingServicesPage';
import PersonalFinancePage from './components/PersonalFinancePage';
import Spinner from './components/common/Spinner';
import BulkImportPage from './components/BulkImportPage';

const AppContent: React.FC = () => {
  const { settings, isInitialized, isAuthenticated, initialConnectionStatus } = useAppContext();

  useEffect(() => {
    if (isInitialized) {
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings.theme, isInitialized]);
  
  if (!isInitialized) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text p-4">
          <Spinner />
          <p className="mt-4">Initializing App...</p>
          {initialConnectionStatus === 'offline' && (
            <div className="mt-4 text-center p-3 bg-yellow-900/50 rounded-lg border border-yellow-700 max-w-xs">
                <p className="text-sm font-semibold text-yellow-300">Could not connect to the cloud.</p>
                <p className="text-xs text-yellow-400">Starting in offline mode. Your data is safe.</p>
            </div>
          )}
        </div>
      );
  }

  if (!isAuthenticated) {
    // Always show the user selection screen with PIN entry, as requested.
    return <UserSelectionScreen />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="gym" element={<GymPage />} />
          <Route path="typing-services" element={<TypingServicesPage />} />
          <Route path="personal" element={<PersonalFinancePage />} />
          <Route path="borrowings" element={<Borrowings />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="bulk-import" element={<BulkImportPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};


const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;