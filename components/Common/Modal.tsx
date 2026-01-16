import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-zinc-700 animate-fade-in-up">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-ink-900 dark:text-white">{title}</h3>
             <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700"><X size={20} /></button>
          </div>
          {children}
       </div>
    </div>
  );
};