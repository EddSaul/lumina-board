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

// Folder Operations
export const folderOperations = {
  /**
   * Get all folders for the current user
   */
  async getFolders(): Promise<Folder[]> {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
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
    // Get the highest position to add the new folder at the end
    const { data: folders } = await supabase
      .from('folders')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = folders && folders.length > 0 ? folders[0].position + 1 : 0;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

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
    const { data, error } = await supabase
      .from('boards')
      .select('*')
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
  async saveShapes(id: string, shapes: any[]): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
      .update({ shapes })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error saving shapes:', error);
      throw error;
    }

    return data;
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
