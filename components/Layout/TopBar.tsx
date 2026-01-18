import React, { useState } from 'react';
import { Menu, Share2, LogOut, Sparkles, Edit2, Check, X, Eye, Edit3, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from '../Common/ThemeToggle';
import { Theme, User } from '../../types';

interface TopBarProps {
  onMenuClick: () => void;
  collaboratorsOpen: boolean;
  setCollaboratorsOpen: (open: boolean) => void;
  onShare: () => void;
  theme: Theme;
  toggleTheme: () => void;
  onLogout: () => void;
  boardTitle?: string;
  onRenameBoard?: (newTitle: string) => void;
  isSharedView?: boolean;
  permission?: 'view' | 'edit' | 'owner';
  currentUser?: User | null;
  collaborators?: User[];
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  collaboratorsOpen,
  setCollaboratorsOpen,
  onShare,
  theme,
  toggleTheme,
  onLogout,
  boardTitle,
  onRenameBoard,
  isSharedView = false,
  permission = 'owner',
  currentUser,
  collaborators = []
}) => {
  const isOwner = permission === 'owner';
  const isReadOnly = permission === 'view';

  // Combine current user with collaborators for display
  const allUsers = currentUser
    ? [currentUser, ...collaborators.filter(c => c.id !== currentUser.id)]
    : collaborators;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(boardTitle || 'Untitled Board');

  const handleSaveTitle = () => {
    if (editedTitle.trim() && onRenameBoard) {
      onRenameBoard(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(boardTitle || 'Untitled Board');
    setIsEditingTitle(false);
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-16 px-4 md:px-6 flex items-center justify-between z-20 pointer-events-none">
      {/* Left: Branding & Menu */}
      <div className="flex items-center space-x-4 pointer-events-auto">
        <button
          onClick={onMenuClick}
          className="bg-white dark:bg-zinc-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 flex items-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
        >
          <Menu size={20} className="text-gray-600 dark:text-gray-300 cursor-pointer" />
        </button>

        {/* Board Title with Edit */}
        {boardTitle ? (
          <div className="flex items-center space-x-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700">
            {isEditingTitle ? (
              <>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="bg-transparent border-none outline-none text-ink-800 dark:text-gray-100 font-semibold w-48"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded text-green-600"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <h1 className="font-semibold text-ink-800 dark:text-gray-100">{boardTitle}</h1>
                {onRenameBoard && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded text-gray-500 hover:text-gray-700"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:flex items-center space-x-2">
                <span className="text-orange-500"><Sparkles size={18} fill="currentColor" /></span>
                <h1 className="font-hand font-bold text-xl text-ink-800 dark:text-gray-100">Lumina Board</h1>
            </div>
            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-md font-medium hidden md:block">Beta</span>
          </>
        )}
      </div>

      {/* Right: Collaboration & Actions */}
      <div className="flex items-center space-x-3 pointer-events-auto">
        {/* Avatar Stack */}
        {allUsers.length > 0 && (
          <div
              className="flex -space-x-2 mr-4 cursor-pointer relative"
              onClick={() => setCollaboratorsOpen(!collaboratorsOpen)}
          >
              {allUsers.slice(0, 4).map((user, index) => (
                user.avatar ? (
                  <img
                    key={user.id}
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 transition-transform hover:scale-110 hover:z-10 object-cover"
                    style={{ zIndex: allUsers.length - index }}
                    title={`${user.name}${index === 0 && currentUser?.id === user.id ? ' (You)' : ''}`}
                  />
                ) : (
                  <div
                    key={user.id}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 transition-transform hover:scale-110 hover:z-10 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: user.color, zIndex: allUsers.length - index }}
                    title={`${user.name}${index === 0 && currentUser?.id === user.id ? ' (You)' : ''}`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )
              ))}
              {allUsers.length > 4 && (
                <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs text-gray-500 border-2 border-white dark:border-zinc-800 font-medium hover:bg-gray-200">
                  +{allUsers.length - 4}
                </button>
              )}

              {/* Simple list of active users popup */}
              {collaboratorsOpen && (
                <div className="absolute top-10 right-0 bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 w-56 z-30 animate-fade-in-up">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                    Active Now ({allUsers.length})
                  </h4>
                  {allUsers.map((u, index) => (
                    <div key={u.id} className="flex items-center space-x-2 mb-2 last:mb-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: u.color}}></span>
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: u.color }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                          {u.name}
                          {index === 0 && currentUser?.id === u.id && (
                            <span className="text-xs text-gray-400 ml-1">(You)</span>
                          )}
                        </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Permission badge for shared boards */}
        {isSharedView && (
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center ${
            isReadOnly
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}>
            {isReadOnly ? (
              <>
                <Eye size={14} className="mr-1.5" />
                View Only
              </>
            ) : (
              <>
                <Edit3 size={14} className="mr-1.5" />
                Can Edit
              </>
            )}
          </div>
        )}

        {/* Share button - only shown for board owners */}
        {isOwner && (
          <button
              onClick={onShare}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-md transition-all active:scale-95"
          >
            <Share2 size={16} className="mr-2" /> Share
          </button>
        )}
        
        <div className="h-6 w-px bg-gray-300 dark:bg-zinc-600 mx-2"></div>
        
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        
        <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Back to Dashboard">
            <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
