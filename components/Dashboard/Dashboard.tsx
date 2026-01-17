import React, { useState, useEffect } from 'react';
import { Sparkles, Folder, Plus, Search, MoreVertical, LayoutGrid, Clock, Star, Settings, LogOut, Trash2, Briefcase, Heart, Archive, FileText, Database, Package, Code } from 'lucide-react';
import { ThemeToggle } from '../Common/ThemeToggle';
import { Theme } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { folderOperations, boardOperations, Folder as FolderType, Board as BoardType } from '../../lib/database';
import CreateFolderModal from './CreateFolderModal';

interface DashboardProps {
  onOpenBoard: (id: string) => void;
  theme: Theme;
  toggleTheme: () => void;
}

// Icon mapping for folder icons
const ICON_MAP: Record<string, any> = {
  Folder,
  Briefcase,
  Heart,
  Star,
  Archive,
  FileText,
  Database,
  Package,
  Code,
};

export const Dashboard: React.FC<DashboardProps> = ({ onOpenBoard, theme, toggleTheme }) => {
  const { user, signOut } = useAuth();
  const [activeFolder, setActiveFolder] = useState<string>('all');

  // State for database data
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);

  // Modal states
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [deleteConfirmFolderId, setDeleteConfirmFolderId] = useState<string | null>(null);

  // Get user display name and initials
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  // Virtual folders (not stored in DB)
  const virtualFolders = [
    { id: 'all', name: 'All Boards', icon: LayoutGrid },
    { id: 'recent', name: 'Recent', icon: Clock },
    { id: 'favorites', name: 'Favorites', icon: Star },
  ];

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [foldersData, boardsData] = await Promise.all([
        folderOperations.getFolders(),
        boardOperations.getBoards(),
      ]);
      setFolders(foldersData);
      setBoards(boardsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle create folder
  const handleCreateFolder = async (name: string, icon: string) => {
    const newFolder = await folderOperations.createFolder(name, icon);
    setFolders([...folders, newFolder]);
  };

  // Handle delete folder
  const handleDeleteFolder = async (folderId: string) => {
    await folderOperations.deleteFolder(folderId);
    setFolders(folders.filter(f => f.id !== folderId));
    setDeleteConfirmFolderId(null);

    // Switch to "All Boards" if we're deleting the active folder
    if (activeFolder === folderId) {
      setActiveFolder('all');
    }
  };

  // Handle create board
  const handleCreateBoard = async (folderId?: string) => {
    const newBoard = await boardOperations.createBoard('Untitled Board', folderId);
    setBoards([newBoard, ...boards]);
    onOpenBoard(newBoard.id);
  };

  // Handle delete board
  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this board?')) {
      await boardOperations.deleteBoard(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
    }
  };

  // Handle toggle favorite
  const handleToggleFavorite = async (boardId: string, isFavorite: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    await boardOperations.toggleFavorite(boardId, !isFavorite);
    setBoards(boards.map(b => b.id === boardId ? { ...b, is_favorite: !isFavorite } : b));
  };

  // Format relative time
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
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Get filtered boards
  const getFilteredBoards = () => {
    let filtered = boards;

    // Filter by active folder
    if (activeFolder === 'all') {
      // Show all boards
    } else if (activeFolder === 'recent') {
      // Show last 10 accessed boards
      filtered = [...boards].sort((a, b) =>
        new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime()
      ).slice(0, 10);
    } else if (activeFolder === 'favorites') {
      filtered = boards.filter(b => b.is_favorite);
    } else {
      // User folder
      filtered = boards.filter(b => b.folder_id === activeFolder);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredBoards = getFilteredBoards();

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
           onClick={() => handleCreateBoard(activeFolder !== 'all' && activeFolder !== 'recent' && activeFolder !== 'favorites' ? activeFolder : undefined)}
           className="w-full py-2.5 px-3 bg-ink-900 dark:bg-white text-white dark:text-ink-900 rounded-xl font-medium text-sm flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all mb-6 group"
        >
           <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" />
           New Board
        </button>

        <div className="space-y-1 flex-1 overflow-y-auto">
           {/* Virtual folders */}
           {virtualFolders.map(folder => {
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

           {/* User folders */}
           {folders.length > 0 && (
             <div className="pt-4 mt-4 border-t border-cream-200 dark:border-zinc-800">
               <div className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Folders</div>
               {folders.map(folder => {
                 const Icon = ICON_MAP[folder.icon] || Folder;
                 const isActive = activeFolder === folder.id;
                 const isHovered = hoveredFolder === folder.id;
                 return (
                   <div
                     key={folder.id}
                     className="relative"
                     onMouseEnter={() => setHoveredFolder(folder.id)}
                     onMouseLeave={() => setHoveredFolder(null)}
                   >
                     <button
                       onClick={() => setActiveFolder(folder.id)}
                       className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
                       }`}
                     >
                       <Icon size={18} className={isActive ? 'text-orange-500' : 'text-gray-400'} />
                       <span className="flex-1 text-left truncate">{folder.name}</span>
                       {isHovered && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             setDeleteConfirmFolderId(folder.id);
                           }}
                           className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                           title="Delete folder"
                         >
                           <Trash2 size={14} />
                         </button>
                       )}
                     </button>
                   </div>
                 );
               })}
             </div>
           )}

           {/* Create folder button */}
           <div className={folders.length === 0 ? "pt-4 mt-4 border-t border-cream-200 dark:border-zinc-800" : ""}>
             {folders.length === 0 && (
               <div className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Folders</div>
             )}
             <button
               onClick={() => setCreateFolderModalOpen(true)}
               className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
             >
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
                  {virtualFolders.find(f => f.id === activeFolder)?.name ||
                   folders.find(f => f.id === activeFolder)?.name ||
                   'All Boards'}
               </h2>
            </div>
            <div className="flex items-center space-x-4">
               <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search your boards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-1.5 bg-gray-100 dark:bg-zinc-800 border-none rounded-full text-sm focus:ring-2 focus:ring-orange-500/50 outline-none w-64 transition-all text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                  />
               </div>
               <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
         </header>

         {/* Board Grid */}
         <div className="flex-1 overflow-y-auto p-8">
            {loading ? (
               <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Loading your boards...</div>
               </div>
            ) : error ? (
               <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="text-red-500">{error}</div>
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Retry
                  </button>
               </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Create New Card */}
                  <button
                     onClick={() => handleCreateBoard(activeFolder !== 'all' && activeFolder !== 'recent' && activeFolder !== 'favorites' ? activeFolder : undefined)}
                     className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all group"
                  >
                     <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                        <Plus size={24} />
                     </div>
                     <span className="font-medium">Create New Board</span>
                  </button>

                  {/* Board Cards */}
                  {filteredBoards.length === 0 && (
                     <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
                        <LayoutGrid size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No boards yet</p>
                        <p className="text-sm">Create your first board to get started</p>
                     </div>
                  )}

                  {filteredBoards.map(board => (
                     <div
                       key={board.id}
                       onClick={() => onOpenBoard(board.id)}
                       className="group relative aspect-[4/3] bg-white dark:bg-zinc-800 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-zinc-700 overflow-hidden cursor-pointer"
                     >
                        {/* Favorite star */}
                        <button
                          onClick={(e) => handleToggleFavorite(board.id, board.is_favorite, e)}
                          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Star
                            size={16}
                            className={board.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                          />
                        </button>

                        {/* Thumbnail Placeholder */}
                        <div className={`h-2/3 w-full ${board.thumbnail_color} relative p-4 transition-transform group-hover:scale-105 duration-500`}>
                           {/* Abstract shapes for thumbnail */}
                           <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/30 backdrop-blur-md"></div>
                           <div className="absolute bottom-4 right-8 w-16 h-16 rounded-lg bg-white/20 backdrop-blur-md rotate-12"></div>
                        </div>

                        <div className="p-4 bg-white dark:bg-zinc-800 absolute bottom-0 w-full">
                           <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                 <h3 className="font-bold text-ink-900 dark:text-gray-100 truncate pr-4">{board.title}</h3>
                                 <p className="text-xs text-gray-400 mt-1 flex items-center">
                                    <Clock size={10} className="mr-1" /> {formatRelativeTime(board.last_accessed_at)}
                                 </p>
                              </div>
                              <button
                                onClick={(e) => handleDeleteBoard(board.id, e)}
                                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                                title="Delete board"
                              >
                                 <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={createFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
      />

      {/* Delete Folder Confirmation */}
      {deleteConfirmFolderId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Folder
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this folder? Boards in this folder will become uncategorized.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmFolderId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFolder(deleteConfirmFolderId)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};