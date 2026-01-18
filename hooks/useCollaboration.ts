import { useEffect, useState, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Point, User, Shape } from '../types';

// Predefined colors for collaborators
const COLLABORATOR_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f97316', // orange
  '#22c55e', // green
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#eab308', // yellow
  '#ef4444', // red
];

// Generate a consistent color based on user ID
function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

// Throttle function
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

export interface Collaborator {
  id: string;
  user: User;
  cursor: Point | null;
}

interface UseCollaborationOptions {
  boardId: string;
  userId: string | null;
  userName: string | null;
  userAvatar?: string | null;
  onShapesChange?: (shapes: Shape[]) => void;
}

interface CursorPayload {
  userId: string;
  cursor: Point;
}

interface ShapesPayload {
  userId: string;
  shapes: Shape[];
}

interface PresenceData {
  userId: string;
  userName: string;
  userAvatar: string;
}

export function useCollaboration({
  boardId,
  userId,
  userName,
  userAvatar,
  onShapesChange,
}: UseCollaborationOptions) {
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const dbChannelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const onShapesChangeRef = useRef(onShapesChange);

  // Keep callback ref updated
  onShapesChangeRef.current = onShapesChange;

  // Broadcast cursor position (throttled)
  const broadcastCursor = useCallback(
    throttle((cursor: Point) => {
      if (!channelRef.current || !userId || !isSubscribedRef.current) return;

      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          userId,
          cursor,
        } as CursorPayload,
      });
    }, 50), // 50ms throttle = 20 updates/sec
    [userId]
  );

  // Broadcast shapes immediately for real-time collaboration
  const broadcastShapes = useCallback((shapes: Shape[]) => {
    if (!channelRef.current || !userId || !isSubscribedRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'shapes',
      payload: {
        userId,
        shapes,
      } as ShapesPayload,
    });
  }, [userId]);

  useEffect(() => {
    if (!boardId || !userId || !userName) return;

    const channelName = `board:${boardId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync - when we first join
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();

      setCollaborators((prev: Map<string, Collaborator>) => {
        const newMap = new Map<string, Collaborator>(prev);
        const activeUserIds = new Set<string>();

        // Add/update users from presence state
        Object.entries(state).forEach(([presenceKey, presenceList]) => {
          const presences = presenceList as unknown as PresenceData[];
          if (presences.length > 0 && presences[0].userId !== userId) {
            const presence = presences[0];
            activeUserIds.add(presence.userId);
            const existing = newMap.get(presence.userId);
            newMap.set(presence.userId, {
              id: presence.userId,
              user: {
                id: presence.userId,
                name: presence.userName,
                avatar: presence.userAvatar || '',
                color: getUserColor(presence.userId),
              },
              cursor: existing ? existing.cursor : null,
            });
          }
        });

        // Remove users no longer in presence
        const keysToDelete: string[] = [];
        newMap.forEach((value: Collaborator, key: string) => {
          if (!activeUserIds.has(key) && key !== userId) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach((key: string) => newMap.delete(key));

        return newMap;
      });
    });

    // Handle user leaving
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const presences = leftPresences as unknown as PresenceData[];
      if (presences && presences.length > 0) {
        const leftUserId = presences[0].userId;
        setCollaborators((prev: Map<string, Collaborator>) => {
          const newMap = new Map<string, Collaborator>(prev);
          newMap.delete(leftUserId);
          return newMap;
        });
      }
    });

    // Handle cursor broadcasts from other users
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const { userId: senderId, cursor } = payload as CursorPayload;

      // Ignore own cursor broadcasts
      if (senderId === userId) return;

      setCollaborators((prev: Map<string, Collaborator>) => {
        const existing = prev.get(senderId);
        if (!existing) return prev;

        const newMap = new Map<string, Collaborator>(prev);
        newMap.set(senderId, {
          ...existing,
          cursor,
        });
        return newMap;
      });
    });

    // Handle shape broadcasts from other users (immediate sync)
    channel.on('broadcast', { event: 'shapes' }, ({ payload }) => {
      const { userId: senderId, shapes } = payload as ShapesPayload;

      // Ignore own shape broadcasts
      if (senderId === userId) return;

      if (onShapesChangeRef.current) {
        onShapesChangeRef.current(shapes);
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        await channel.track({
          userId,
          userName,
          userAvatar: userAvatar || '',
        });
      }
    });

    return () => {
      isSubscribedRef.current = false;
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [boardId, userId, userName, userAvatar]);

  // Subscribe to database changes for real-time shape sync
  useEffect(() => {
    if (!boardId) return;

    const dbChannel = supabase
      .channel(`db-board:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'boards',
          filter: `id=eq.${boardId}`,
        },
        (payload) => {
          const newShapes = payload.new?.shapes as Shape[] | undefined;
          if (newShapes && onShapesChangeRef.current) {
            onShapesChangeRef.current(newShapes);
          }
        }
      )
      .subscribe();

    dbChannelRef.current = dbChannel;

    return () => {
      dbChannel.unsubscribe();
      dbChannelRef.current = null;
    };
  }, [boardId]);

  // Convert Map to array for rendering
  const collaboratorsArray: Collaborator[] = Array.from(collaborators.values());

  return {
    collaborators: collaboratorsArray,
    broadcastCursor,
    broadcastShapes,
    collaboratorCount: collaboratorsArray.length,
  };
}
