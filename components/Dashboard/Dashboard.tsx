import React, { useState } from 'react';
import { Sparkles, Folder, Plus, Search, MoreVertical, LayoutGrid, Clock, Star, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '../Common/ThemeToggle';
import { Theme } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardProps {
  onOpenBoard: (id: string) => void;
  theme: Theme;
  toggleTheme: () => void;
}

interface BoardMeta {
  id: string;
  title: string;
  lastEdited: string;
  folderId: string;
  thumbnailColor: string;
}

interface FolderMeta {
  id: string;
  name: string;
  icon: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenBoard, theme, toggleTheme }) => {
  const { user, signOut } = useAuth();
  const [activeFolder, setActiveFolder] = useState<string>('all');

  // Get user display name and initials
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  
  const folders: FolderMeta[] = [
    { id: 'all', name: 'All Boards', icon: LayoutGrid },
    { id: 'recent', name: 'Recent', icon: Clock },
    { id: 'favorites', name: 'Favorites', icon: Star },
    { id: 'work', name: 'Work Projects', icon: Folder },
    { id: 'personal', name: 'Personal', icon: Folder },
    { id: 'ideas', name: 'Brainstorming', icon: Folder },
  ];

  const [boards] = useState<BoardMeta[]>([
    { id: '1', title: 'Q4 Product Roadmap', lastEdited: '2 mins ago', folderId: 'work', thumbnailColor: 'bg-orange-100 dark:bg-orange-900/30' },
    { id: '2', title: 'Marketing Campaign', lastEdited: 'Yesterday', folderId: 'work', thumbnailColor: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: '3', title: 'Dream Home Ideas', lastEdited: '3 days ago', folderId: 'personal', thumbnailColor: 'bg-green-100 dark:bg-green-900/30' },
    { id: '4', title: 'App UI Flow', lastEdited: '1 week ago', folderId: 'work', thumbnailColor: 'bg-purple-100 dark:bg-purple-900/30' },
    { id: '5', title: 'Weekly Groceries', lastEdited: '2 weeks ago', folderId: 'personal', thumbnailColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  ]);

  const filteredBoards = boards.filter(b => {
    if (activeFolder === 'all') return true;
    if (activeFolder === 'recent') return true; // Simplify for demo
    if (activeFolder === 'favorites') return ['1', '3'].includes(b.id);
    return b.folderId === activeFolder;
  });

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-zinc-950 text-ink-800 dark:text-gray-200 flex transition-colors duration-300">
      
      {/* Sidebar */}
      <div className="w-64 border-r border-cream-200 dark:border-zinc-800 flex flex-col p-4 bg-white dark:bg-zinc-900">
        <div className="flex items-center space-x-2 px-2 mb-8">
           <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} fill="currentColor" />
           </div>
           <h1 className="font-hand font-bold text-xl tracking-tight text-ink-900 dark:text-white">Lumina</h1>
        </div>

        <button 
           onClick={() => onOpenBoard('new')}
           className="w-full py-2.5 px-3 bg-ink-900 dark:bg-white text-white dark:text-ink-900 rounded-xl font-medium text-sm flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all mb-6 group"
        >
           <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" />
           New Board
        </button>

        <div className="space-y-1 flex-1 overflow-y-auto">
           {folders.map(folder => {
             const Icon = folder.icon;
             const isActive = activeFolder === folder.id;
             return (
               <button
                 key={folder.id}
                 onClick={() => setActiveFolder(folder.id)}
                 className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
                 }`}
               >
                 <Icon size={18} className={isActive ? 'text-orange-500' : 'text-gray-400'} />
                 <span>{folder.name}</span>
               </button>
             );
           })}
           
           <div className="pt-4 mt-4 border-t border-cream-200 dark:border-zinc-800">
             <div className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Folders</div>
             <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                <Plus size={16} />
                <span>Create Folder</span>
             </button>
           </div>
        </div>

        <div className="mt-4 pt-4 border-t border-cream-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
               {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
               ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                     {initials}
                  </div>
               )}
               <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[120px]">{displayName}</div>
            </div>
            <button onClick={signOut} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sign out">
               <LogOut size={16} />
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
         {/* Header */}
         <header className="h-16 border-b border-cream-200 dark:border-zinc-800 flex items-center justify-between px-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
               <h2 className="text-xl font-bold font-hand text-ink-900 dark:text-white">
                  {folders.find(f => f.id === activeFolder)?.name}
               </h2>
            </div>
            <div className="flex items-center space-x-4">
               <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search your boards..." 
                    className="pl-10 pr-4 py-1.5 bg-gray-100 dark:bg-zinc-800 border-none rounded-full text-sm focus:ring-2 focus:ring-orange-500/50 outline-none w-64 transition-all text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                  />
               </div>
               <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
         </header>

         {/* Board Grid */}
         <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {/* Create New Card */}
               <button 
                  onClick={() => onOpenBoard('new')}
                  className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all group"
               >
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                     <Plus size={24} />
                  </div>
                  <span className="font-medium">Create New Board</span>
               </button>

               {/* Board Cards */}
               {filteredBoards.map(board => (
                  <div 
                    key={board.id}
                    onClick={() => onOpenBoard(board.id)}
                    className="group relative aspect-[4/3] bg-white dark:bg-zinc-800 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-zinc-700 overflow-hidden cursor-pointer"
                  >
                     {/* Thumbnail Placeholder */}
                     <div className={`h-2/3 w-full ${board.thumbnailColor} relative p-4 transition-transform group-hover:scale-105 duration-500`}>
                        {/* Abstract shapes for thumbnail */}
                        <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/30 backdrop-blur-md"></div>
                        <div className="absolute bottom-4 right-8 w-16 h-16 rounded-lg bg-white/20 backdrop-blur-md rotate-12"></div>
                     </div>
                     
                     <div className="p-4 bg-white dark:bg-zinc-800 absolute bottom-0 w-full">
                        <div className="flex justify-between items-start">
                           <div>
                              <h3 className="font-bold text-ink-900 dark:text-gray-100 truncate pr-4">{board.title}</h3>
                              <p className="text-xs text-gray-400 mt-1 flex items-center">
                                 <Clock size={10} className="mr-1" /> {board.lastEdited}
                              </p>
                           </div>
                           <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700">
                              <MoreVertical size={16} />
                           </button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};