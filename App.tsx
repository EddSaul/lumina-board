import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/Login/LoginPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Board } from './components/Board/Board';
import { Theme } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'board'>('dashboard');

  // Initialize theme from system preference or default to light
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-cream-100 dark:bg-ink-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  // If not authenticated, show login page
  if (!user) {
    return (
      <LoginPage
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // Authenticated views
  return (
    <>
      {currentView === 'dashboard' && (
        <Dashboard
          onOpenBoard={(id) => setCurrentView('board')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {currentView === 'board' && (
        <Board
          onBack={() => setCurrentView('dashboard')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
