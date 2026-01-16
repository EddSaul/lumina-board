import React from 'react';
import { Menu, Share2, LogOut, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../Common/ThemeToggle';
import { MOCK_USERS } from '../../constants';
import { Theme } from '../../types';

interface TopBarProps {
  onMenuClick: () => void;
  collaboratorsOpen: boolean;
  setCollaboratorsOpen: (open: boolean) => void;
  onShare: () => void;
  theme: Theme;
  toggleTheme: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  collaboratorsOpen,
  setCollaboratorsOpen,
  onShare,
  theme,
  toggleTheme,
  onLogout
}) => {
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
        <div className="hidden md:flex items-center space-x-2">
            <span className="text-orange-500"><Sparkles size={18} fill="currentColor" /></span>
            <h1 className="font-hand font-bold text-xl text-ink-800 dark:text-gray-100">Lumina Board</h1>
        </div>
        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-md font-medium hidden md:block">Beta</span>
      </div>

      {/* Right: Collaboration & Actions */}
      <div className="flex items-center space-x-3 pointer-events-auto">
        {/* Avatar Stack */}
        <div 
            className="flex -space-x-2 mr-4 cursor-pointer relative" 
            onClick={() => setCollaboratorsOpen(!collaboratorsOpen)}
        >
            {MOCK_USERS.map(user => (
              <img 
              key={user.id} 
              src={user.avatar} 
              alt={user.name} 
              className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 transition-transform hover:scale-110 hover:z-10"
              title={user.name}
              />
            ))}
            <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs text-gray-500 border-2 border-white dark:border-zinc-800 font-medium hover:bg-gray-200">
              +3
            </button>
            
            {/* Simple list of active users popup */}
            {collaboratorsOpen && (
              <div className="absolute top-10 right-0 bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 w-48 z-30 animate-fade-in-up">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Active Now</h4>
                {MOCK_USERS.map(u => (
                  <div key={u.id} className="flex items-center space-x-2 mb-2 last:mb-0">
                      <span className="w-2 h-2 rounded-full" style={{backgroundColor: u.color}}></span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{u.name}</span>
                  </div>
                ))}
              </div>
            )}
        </div>

        <button 
            onClick={onShare}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-md transition-all active:scale-95"
        >
          <Share2 size={16} className="mr-2" /> Share
        </button>
        
        <div className="h-6 w-px bg-gray-300 dark:bg-zinc-600 mx-2"></div>
        
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        
        <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Back to Dashboard">
            <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
