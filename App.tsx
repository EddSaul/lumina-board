import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/Login/LoginPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Board } from './components/Board/Board';
import { Theme } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { boardOperations, shareOperations } from './lib/database';

function AppContent() {
  const { user, loading, returnUrl, setReturnUrl } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'board' | 'shared-board'>('dashboard');
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharePermission, setSharePermission] = useState<'view' | 'edit' | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

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

  // Parse URL for share token on mount
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/share\/([a-zA-Z0-9]+)$/);
    if (match) {
      const token = match[1];
      setShareToken(token);
      setCurrentView('shared-board');
      // Store the share URL so we can redirect after login
      if (!user && !loading) {
        setReturnUrl(window.location.href);
      }
    }
  }, []);

  // Handle share token after user is authenticated
  useEffect(() => {
    const handleShareAccess = async () => {
      if (!shareToken || !user) return;

      try {
        setShareError(null);
        const share = await shareOperations.claimShare(shareToken);

        if (!share || !share.board) {
          setShareError('This share link is invalid or has expired.');
          return;
        }

        setSharePermission(share.permission);
        setCurrentBoardId(share.board_id);

        // Clear the share URL from browser history
        window.history.replaceState({}, '', '/');

        // Clear return URL if it was set
        if (returnUrl) {
          setReturnUrl(null);
        }
      } catch (error) {
        console.error('Error accessing shared board:', error);
        setShareError('Failed to access the shared board. Please try again.');
      }
    };

    handleShareAccess();
  }, [shareToken, user]);

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
    setShareToken(null);
    setSharePermission(null);
    setShareError(null);
    // Clear URL if on a share path
    if (window.location.pathname.startsWith('/share/')) {
      window.history.replaceState({}, '', '/');
    }
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
  // Pass share URL as return URL if accessing a share link
  if (!user) {
    return (
      <LoginPage
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // Handle share error
  if (shareError) {
    return (
      <div className="min-h-screen w-full bg-cream-100 dark:bg-ink-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Share Link Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{shareError}</p>
          <button
            onClick={handleBackToDashboard}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
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

      {currentView === 'shared-board' && currentBoardId && (
        <Board
          key={`shared-${currentBoardId}`}
          boardId={currentBoardId}
          onBack={handleBackToDashboard}
          onSwitchBoard={handleSwitchBoard}
          theme={theme}
          toggleTheme={toggleTheme}
          permission={sharePermission || 'view'}
          isSharedView={true}
        />
      )}

      {/* Loading state for shared board while claiming */}
      {currentView === 'shared-board' && !currentBoardId && !shareError && (
        <div className="min-h-screen w-full bg-cream-100 dark:bg-ink-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Accessing shared board...</p>
          </div>
        </div>
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
