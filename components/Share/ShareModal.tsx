import React, { useState, useEffect } from 'react';
import { X, Link2, Copy, Check, Trash2, Eye, Edit3, Users, Globe } from 'lucide-react';
import { shareOperations, BoardShare } from '../../lib/database';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  boardId,
  boardTitle,
}) => {
  const [shares, setShares] = useState<BoardShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newPermission, setNewPermission] = useState<'view' | 'edit'>('view');
  const [newShareLink, setNewShareLink] = useState<string | null>(null);

  // Load existing shares
  useEffect(() => {
    if (isOpen) {
      loadShares();
    }
  }, [isOpen, boardId]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const sharesData = await shareOperations.getSharesForBoard(boardId);
      setShares(sharesData);
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    try {
      setCreating(true);
      const share = await shareOperations.createShare(boardId, newPermission);
      const shareUrl = `${window.location.origin}/share/${share.share_token}`;
      setNewShareLink(shareUrl);
      setShares([share, ...shares]);
    } catch (error) {
      console.error('Error creating share:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleUpdatePermission = async (shareId: string, permission: 'view' | 'edit') => {
    try {
      await shareOperations.updateSharePermission(shareId, permission);
      setShares(shares.map(s => s.id === shareId ? { ...s, permission } : s));
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await shareOperations.revokeShare(shareId);
      setShares(shares.filter(s => s.id !== shareId));
      if (newShareLink) {
        // Check if we revoked the newly created share
        const revokedShare = shares.find(s => s.id === shareId);
        if (revokedShare && newShareLink.includes(revokedShare.share_token)) {
          setNewShareLink(null);
        }
      }
    } catch (error) {
      console.error('Error revoking share:', error);
    }
  };

  const getShareUrl = (token: string) => `${window.location.origin}/share/${token}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-gray-100 dark:border-zinc-700 animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-ink-900 dark:text-white">Share Board</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{boardTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Create New Share Link */}
        <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Globe size={18} className="text-orange-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Create Share Link</h4>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <select
              value={newPermission}
              onChange={(e) => setNewPermission(e.target.value as 'view' | 'edit')}
              className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/50 outline-none"
            >
              <option value="view">Can view</option>
              <option value="edit">Can edit</option>
            </select>
            <button
              onClick={handleCreateShare}
              disabled={creating}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50 flex items-center space-x-2"
            >
              <Link2 size={16} />
              <span>{creating ? 'Creating...' : 'Create Link'}</span>
            </button>
          </div>

          {/* New Share Link Display */}
          {newShareLink && (
            <div className="flex items-center space-x-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2">
              <input
                type="text"
                readOnly
                value={newShareLink}
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none"
              />
              <button
                onClick={() => handleCopyLink(newShareLink)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {copied ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-gray-500" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Existing Shares */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Users size={18} className="text-gray-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Active Share Links</h4>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
              {shares.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading shares...</div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Link2 size={32} className="mx-auto mb-2 opacity-50" />
              <p>No active share links</p>
              <p className="text-xs mt-1">Create a link above to share this board</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-lg group"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${share.permission === 'edit' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-zinc-700'}`}>
                      {share.permission === 'edit' ? (
                        <Edit3 size={14} className="text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Eye size={14} className="text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {share.shared_with_user_id ? 'User claimed' : 'Anyone with link'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {getShareUrl(share.share_token).slice(0, 40)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={share.permission}
                      onChange={(e) => handleUpdatePermission(share.id, e.target.value as 'view' | 'edit')}
                      className="px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-orange-500/50 outline-none"
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                    <button
                      onClick={() => handleCopyLink(getShareUrl(share.share_token))}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 hover:text-gray-700"
                      title="Copy link"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500"
                      title="Revoke access"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Anyone with the link must be logged in to access the board
          </p>
        </div>
      </div>
    </div>
  );
};
