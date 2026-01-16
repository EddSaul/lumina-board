import { useState, useCallback } from 'react';
import { Shape } from '../types';

export const useHistory = (initialState: Shape[]) => {
  const [history, setHistory] = useState<Shape[][]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pushState = useCallback((newState: Shape[]) => {
    const nextHistory = [...history.slice(0, currentIndex + 1), newState];
    setHistory(nextHistory);
    setCurrentIndex(nextHistory.length - 1);
  }, [history, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [history, currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [history, currentIndex]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return { pushState, undo, redo, canUndo, canRedo, currentShapes: history[currentIndex] };
};