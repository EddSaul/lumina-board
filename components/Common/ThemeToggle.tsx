import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Theme } from '../../types';

interface ThemeToggleProps {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => (
  <button
    onClick={toggleTheme}
    className="p-2 rounded-full bg-cream-200 dark:bg-zinc-800 text-ink-800 dark:text-cream-50 transition-all hover:scale-110 active:scale-95"
    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
  >
    {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
  </button>
);