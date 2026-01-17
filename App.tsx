import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/Login/LoginPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Board } from './components/Board/Board';
import { Theme } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { boardOperations } from './lib/database';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'board'>('dashboard');
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

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

  const handleOpenBoard = async (id: string) => {
    if (id === 'new') {
      // Create a new board first
      try {
        const newBoard = await boardOperations.createBoard('Untitled Board');
        setCurrentBoardId(newBoard.id);
        setCurrentView('board');
      } catch (error) {
        console.error('Error creating board:', error);
      }
    } else {
      setCurrentBoardId(id);
      setCurrentView('board');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setCurrentBoardId(null);
  };

  const handleSwitchBoard = (newBoardId: string) => {
    setCurrentBoardId(newBoardId);
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
          onOpenBoard={handleOpenBoard}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {currentView === 'board' && currentBoardId && (
        <Board
          key={currentBoardId}
          boardId={currentBoardId}
          onBack={handleBackToDashboard}
          onSwitchBoard={handleSwitchBoard}
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
