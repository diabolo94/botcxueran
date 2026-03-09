
import React, { ReactNode } from 'react';
import { XMarkIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-start pt-4 sm:pt-10"
      onClick={onClose}
    >
      <div
        className="bg-parchment-white dark:bg-midnight-ink rounded-lg shadow-2xl w-11/12 xl:w-[95%] max-w-7xl max-h-[95vh] flex flex-col border border-stone-border dark:border-slate-gray"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-3 border-b border-stone-border dark:border-slate-gray">
          <h2 className="text-lg font-bold text-celestial-gold font-serif">{title}</h2>
          <button onClick={onClose} className="text-slate-text dark:text-moonlit-stone hover:text-ink-text dark:hover:text-parchment transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
