import { supabase } from './supabase';

// Types
export interface Folder {
  id: string;
  name: string;
  icon: string;
  user_id: string;
  is_system: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  title: string;
  folder_id: string | null;
  user_id: string;
  thumbnail_color: string;
  shapes: any[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface BoardShare {
  id: string;
  board_id: string;
  share_token: string;
  shared_with_user_id: string | null;
  permission: 'view' | 'edit';
  created_by: string;
  created_at: string;
  // Joined data
  board?: Board;
  owner_email?: string;
}

// Folder Operations
export const folderOperations = {
  /**
   * Get all folders for the current user
   */
  async getFolders(): Promise<Folder[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.user.id)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching folders:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Create a new folder
   */
  async createFolder(name: string, icon: string = 'Folder'): Promise<Folder> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // Get the highest position to add the new folder at the end (for this user only)
    const { data: folders } = await supabase
      .from('folders')
      .select('position')
      .eq('user_id', user.user.id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = folders && folders.length > 0 ? folders[0].position + 1 : 0;

    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        icon,
        user_id: user.user.id,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update a folder
   */
  async updateFolder(id: string, updates: Partial<Pick<Folder, 'name' | 'icon' | 'position'>>): Promise<Folder> {
    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating folder:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a folder (boards in this folder will have folder_id set to NULL)
   */
  async deleteFolder(id: string): Promise<void> {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  },
};

// Board Operations
export const boardOperations = {
  /**
   * Get all boards for the current user
   */
  async getBoards(): Promise<Board[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.user.id)
      .order('last_accessed_at', { ascending: false });

    if (error) {
      console.error('Error fetching boards:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get a specific board by ID
   */
  async getBoard(id: string): Promise<Board | null> {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching board:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new board
   */
  async createBoard(title: string = 'Untitled Board', folderId?: string | null): Promise<Board> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // Random thumbnail color from available options
    const colors = [
      'bg-blue-100 dark:bg-blue-900/30',
      'bg-purple-100 dark:bg-purple-900/30',
      'bg-green-100 dark:bg-green-900/30',
      'bg-yellow-100 dark:bg-yellow-900/30',
      'bg-red-100 dark:bg-red-900/30',
      'bg-pink-100 dark:bg-pink-900/30',
      'bg-indigo-100 dark:bg-indigo-900/30',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { data, error } = await supabase
      .from('boards')
      .insert({
        title,
        folder_id: folderId,
        user_id: user.user.id,
        thumbnail_color: randomColor,
        shapes: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating board:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update a board's title
   */
  async updateBoardTitle(id: string, title: string): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
      .update({ title })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating board title:', error);
      throw error;
    }

    return data;
  },

  /**
   * Move a board to a different folder
   */
  async moveBoardToFolder(id: string, folderId: string | null): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
      .update({ folder_id: folderId })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error moving board:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a board
   */
  async deleteBoard(id: string): Promise<void> {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting board:', error);
      throw error;
    }
  },

  /**
   * Toggle favorite status of a board
   */
  async toggleFavorite(id: string, isFavorite: boolean): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }

    return data;
  },

  /**
   * Save shapes to a board
   */
  async saveShapes(id: string, shapes: any[]): Promise<void> {
    const { error } = await supabase
      .from('boards')
      .update({ shapes })
      .eq('id', id);

    if (error) {
      console.error('Error saving shapes:', error);
      throw error;
    }
  },

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(id: string): Promise<void> {
    const { error } = await supabase
      .from('boards')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating last accessed:', error);
      throw error;
    }
  },
};

// Helper to generate a random token
const generateShareToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Share Operations
export const shareOperations = {
  /**
   * Create a new share for a board
   */
  async createShare(boardId: string, permission: 'view' | 'edit'): Promise<BoardShare> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const shareToken = generateShareToken();

    const { data, error } = await supabase
      .from('board_shares')
      .insert({
        board_id: boardId,
        share_token: shareToken,
        permission,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating share:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get share by token (for URL access)
   */
  async getShareByToken(token: string): Promise<BoardShare | null> {
    const { data, error } = await supabase
      .from('board_shares')
      .select('*, boards(*)')
      .eq('share_token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching share by token:', error);
      throw error;
    }

    // Transform the response to include board data
    if (data && data.boards) {
      return {
        ...data,
        board: data.boards as Board,
      };
    }

    return data;
  },

  /**
   * Get all shares for a board (for owner to manage)
   */
  async getSharesForBoard(boardId: string): Promise<BoardShare[]> {
    const { data, error } = await supabase
      .from('board_shares')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shares for board:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get boards shared with current user
   */
  async getSharedWithMe(): Promise<(BoardShare & { board: Board })[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('board_shares')
      .select('*, boards(*)')
      .eq('shared_with_user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shared boards:', error);
      throw error;
    }

    // Transform the response to include board data
    return (data || []).map(share => ({
      ...share,
      board: share.boards as Board,
    }));
  },

  /**
   * Update share permission
   */
  async updateSharePermission(shareId: string, permission: 'view' | 'edit'): Promise<void> {
    const { error } = await supabase
      .from('board_shares')
      .update({ permission })
      .eq('id', shareId);

    if (error) {
      console.error('Error updating share permission:', error);
      throw error;
    }
  },

  /**
   * Revoke/delete a share
   */
  async revokeShare(shareId: string): Promise<void> {
    const { error } = await supabase
      .from('board_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('Error revoking share:', error);
      throw error;
    }
  },

  /**
   * Claim a share (assign to current user when they access via token)
   */
  async claimShare(token: string): Promise<BoardShare | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // First, get the share to check if it's unclaimed or already claimed by this user
    const { data: existingShare, error: fetchError } = await supabase
      .from('board_shares')
      .select('*')
      .eq('share_token', token)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return null; // Share not found
      }
      console.error('Error fetching share:', fetchError);
      throw fetchError;
    }

    // Fetch the board data separately to ensure we always have it
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('*')
      .eq('id', existingShare.board_id)
      .single();

    if (boardError || !board) {
      console.error('Error fetching board for share:', boardError);
      return null;
    }

    // Check if user is the board owner - they don't need to claim, just redirect
    if (board.user_id === user.user.id) {
      return {
        ...existingShare,
        board: board,
        permission: 'edit' as const, // Owner has full access
      };
    }

    // If already claimed by this user, return it
    if (existingShare.shared_with_user_id === user.user.id) {
      return {
        ...existingShare,
        board: board,
      };
    }

    // If already claimed by someone else, create a new share for this user
    if (existingShare.shared_with_user_id !== null) {
      const newShareToken = generateShareToken();
      const { data: newShare, error: createError } = await supabase
        .from('board_shares')
        .insert({
          board_id: existingShare.board_id,
          share_token: newShareToken,
          permission: existingShare.permission,
          created_by: existingShare.created_by,
          shared_with_user_id: user.user.id,
        })
        .select('*')
        .single();

      if (createError) {
        // If unique constraint violation, user already has access
        if (createError.code === '23505') {
          const { data: userShare } = await supabase
            .from('board_shares')
            .select('*')
            .eq('board_id', existingShare.board_id)
            .eq('shared_with_user_id', user.user.id)
            .single();

          if (userShare) {
            return {
              ...userShare,
              board: board,
            };
          }
        }
        console.error('Error creating share for user:', createError);
        throw createError;
      }

      return newShare ? {
        ...newShare,
        board: board,
      } : null;
    }

    // Claim the unclaimed share
    const { data, error } = await supabase
      .from('board_shares')
      .update({ shared_with_user_id: user.user.id })
      .eq('share_token', token)
      .is('shared_with_user_id', null) // Only update if still unclaimed
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error claiming share:', error);
      throw error;
    }

    // If no rows were updated (race condition - someone else claimed it),
    // create a new share for this user
    if (!data) {
      const newShareToken = generateShareToken();
      const { data: newShare, error: createError } = await supabase
        .from('board_shares')
        .insert({
          board_id: existingShare.board_id,
          share_token: newShareToken,
          permission: existingShare.permission,
          created_by: existingShare.created_by,
          shared_with_user_id: user.user.id,
        })
        .select('*')
        .maybeSingle();

      if (createError) {
        // If unique constraint violation, user already has access - fetch it
        if (createError.code === '23505') {
          const { data: userShare } = await supabase
            .from('board_shares')
            .select('*')
            .eq('board_id', existingShare.board_id)
            .eq('shared_with_user_id', user.user.id)
            .single();

          if (userShare) {
            return {
              ...userShare,
              board: board,
            };
          }
        }
        console.error('Error creating share for user:', createError);
        throw createError;
      }

      return newShare ? {
        ...newShare,
        board: board,
      } : null;
    }

    return {
      ...data,
      board: board,
    };
  },

  /**
   * Check if user has access to a board (owner or shared)
   */
  async checkBoardAccess(boardId: string): Promise<{ hasAccess: boolean; permission: 'owner' | 'view' | 'edit' | null }> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { hasAccess: false, permission: null };
    }

    // Check if owner
    const { data: board } = await supabase
      .from('boards')
      .select('user_id')
      .eq('id', boardId)
      .single();

    if (board?.user_id === user.user.id) {
      return { hasAccess: true, permission: 'owner' };
    }

    // Check if shared with user
    const { data: share } = await supabase
      .from('board_shares')
      .select('permission')
      .eq('board_id', boardId)
      .eq('shared_with_user_id', user.user.id)
      .single();

    if (share) {
      return { hasAccess: true, permission: share.permission as 'view' | 'edit' };
    }

    return { hasAccess: false, permission: null };
  },
};
