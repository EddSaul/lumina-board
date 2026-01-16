import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, visible, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 bg-ink-900 text-white px-4 py-2 rounded-full shadow-lg transition-all duration-300 z-[100] flex items-center space-x-2 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
      <Check size={16} className="text-green-400" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};