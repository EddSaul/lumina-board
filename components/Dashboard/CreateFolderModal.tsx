import { useState } from 'react';
import { X, Folder, Briefcase, Heart, Star, Archive, FileText, Database, Package, Code } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, icon: string) => Promise<void>;
}

const FOLDER_ICONS = [
  { name: 'Folder', Icon: Folder },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'Heart', Icon: Heart },
  { name: 'Star', Icon: Star },
  { name: 'Archive', Icon: Archive },
  { name: 'FileText', Icon: FileText },
  { name: 'Database', Icon: Database },
  { name: 'Package', Icon: Package },
  { name: 'Code', Icon: Code },
];

export default function CreateFolderModal({ isOpen, onClose, onSubmit }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    if (name.length > 50) {
      setError('Folder name must be less than 50 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onSubmit(name.trim(), selectedIcon);
      // Reset form
      setName('');
      setSelectedIcon('Folder');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setSelectedIcon('Folder');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Folder</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Folder Name Input */}
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Folder Name
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              maxLength={50}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
              autoFocus
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {name.length}/50 characters
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {FOLDER_ICONS.map(({ name: iconName, Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  disabled={loading}
                  className={`p-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                    selectedIcon === iconName
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto ${
                    selectedIcon === iconName
                      ? 'text-blue-500'
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
