import React, { useState } from 'react';
import { Sparkles, X, Search, Plus, FileText, Clock, Layout, Keyboard, Settings, Loader2, Trash2, Edit2, Check, ArrowLeft } from 'lucide-react';
import { Theme } from '../../types';

interface BoardMeta {
  id: string;
  title: string;
  last_accessed_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  isGridOn: boolean;
  toggleGrid: () => void;
  onCreateBoard: () => void;
  onShowShortcuts: () => void;
  onOpenSettings: () => void;
  onBackToDashboard: () => void;
  currentBoardTitle?: string;
  currentBoardId?: string;
  boards?: BoardMeta[];
  onSwitchBoard?: (boardId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  theme,
  isGridOn,
  toggleGrid,
  onCreateBoard,
  onShowShortcuts,
  onOpenSettings,
  onBackToDashboard,
  currentBoardTitle = 'Untitled Board',
  currentBoardId,
  boards = [],
  onSwitchBoard
}) => {
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-ink-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 bottom-0 w-80 bg-cream-50 dark:bg-zinc-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-r border-cream-200 dark:border-zinc-800 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-cream-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Sparkles size={18} fill="currentColor" />
             </div>
             <span className="font-hand font-bold text-xl text-ink-800 dark:text-cream-50">Lumina</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 relative">
          
          {/* Back to Dashboard */}
          <button 
            onClick={onBackToDashboard}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 transition-colors mb-2"
          >
             <ArrowLeft size={18} />
             <span className="font-medium text-sm">Back to Dashboard</span>
          </button>

          {/* Current Board Info */}
          <div className="px-3 py-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30">
             <h3 className="text-xs font-bold text-orange-600 dark:text-orange-300 uppercase tracking-wider mb-1">Current Board</h3>
             <p className="font-bold text-ink-900 dark:text-white truncate">{currentBoardTitle}</p>
          </div>

          {/* Boards List */}
          {boards.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Quick Switch</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                 {boards.slice(0, 10).map((board) => (
                     <div
                       key={board.id}
                       onClick={() => {
                         if (onSwitchBoard && board.id !== currentBoardId) {
                           onSwitchBoard(board.id);
                           onClose();
                         }
                       }}
                       className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                         board.id === currentBoardId
                           ? 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm'
                           : 'hover:bg-gray-100 dark:hover:bg-zinc-800 border border-transparent opacity-70 hover:opacity-100'
                       }`}
                     >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center mr-3 text-gray-500">
                          <FileText size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="text-sm font-semibold truncate text-gray-700 dark:text-gray-300">{board.title}</h4>
                           <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(board.last_accessed_at)}</p>
                        </div>
                     </div>
                 ))}
              </div>
            </div>
          )}

          {/* Useful Utilities Section */}
          <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Utilities</h3>
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={onShowShortcuts}
                  className="p-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:border-orange-400 transition-colors"
                >
                   <Keyboard size={20} className="mb-2 text-pink-500" />
                   <span className="text-xs font-medium">Shortcuts</span>
                </button>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cream-200 dark:border-zinc-800 bg-cream-100/50 dark:bg-zinc-900/50">
           <button 
             onClick={onOpenSettings}
             className="w-full flex items-center p-3 rounded-xl hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 transition-all text-gray-600 dark:text-gray-400"
           >
              <Settings size={18} className="mr-3" />
              <span className="text-sm font-medium">App Settings</span>
           </button>
        </div>
      </div>
    </>
  );
};
